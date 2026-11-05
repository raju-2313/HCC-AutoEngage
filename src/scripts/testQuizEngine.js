/**
 * src/scripts/testQuizEngine.js
 * End-to-end test suite for Phase 3: Daily Quiz Engine
 *
 * Usage: node src/scripts/testQuizEngine.js
 */

import 'dotenv/config';
import { QUESTION_BANK, getDailyQuestion, getQuestionById } from '../services/quiz/questionBank.js';
import { buildQuizMessage } from '../services/quiz/quizService.js';
import { createQuiz, publishQuiz, getQuizById } from '../database/queries/quizzes.js';
import { upsertMember, getMemberByDiscordId } from '../database/queries/members.js';
import { submitQuizAttempt, hasMemberAttempted } from '../database/queries/attempts.js';
import { supabaseAdmin } from '../database/client.js';

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  HCC AutoEngage – Phase 3 Quiz Engine Verification Suite');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Verify Question Bank Integrity
  console.log('1️⃣ Validating Question Bank...');
  console.log(`   Found ${QUESTION_BANK.length} verified technical questions.`);

  for (const q of QUESTION_BANK) {
    if (!q.id || !q.title || !q.questionText || !q.explanation) {
      throw new Error(`Question ${q.id} missing mandatory text fields.`);
    }
    if (!['beginner', 'advanced'].includes(q.difficulty)) {
      throw new Error(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`Question ${q.id} options must be an array of at least 2 choices.`);
    }
    const optionIds = q.options.map((o) => o.id);
    if (!optionIds.includes(q.correctOption)) {
      throw new Error(`Question ${q.id} correctOption ${q.correctOption} is not in options list!`);
    }
  }
  console.log('   ✅ All questions passed structural validation.\n');

  // 2. Validate Component & Embed Builder
  console.log('2️⃣ Testing Discord Embed and Button Generator...');
  const sampleQ = getDailyQuestion();
  const sampleQuiz = {
    title: sampleQ.title,
    difficulty: sampleQ.difficulty,
    points_reward: sampleQ.pointsReward,
    xp_reward: sampleQ.xpReward,
  };
  const payload = buildQuizMessage(sampleQuiz, sampleQ);

  if (!payload.embeds || payload.embeds.length !== 1) {
    throw new Error('Payload must contain exactly 1 Embed.');
  }
  if (!payload.components || payload.components.length !== 1) {
    throw new Error('Payload must contain 1 ActionRow component.');
  }
  const buttons = payload.components[0].components;
  if (buttons.length !== sampleQ.options.length) {
    throw new Error(`Expected ${sampleQ.options.length} buttons, got ${buttons.length}`);
  }
  console.log(`   ✅ Embed generated with ${buttons.length} interactive option buttons.\n`);

  // 3. Test Full Lifecycle: Creation -> Publishing -> Answering -> Duplicate Prevention
  console.log('3️⃣ Testing Quiz Submission Flow in Supabase...');

  const TEST_DISCORD_USER = 'test_quiz_engine_user_01';
  const testMember = await upsertMember({
    discordId: TEST_DISCORD_USER,
    username: 'QuizEngineTester',
  });

  const createdQuiz = await createQuiz({
    title: 'TEST_PHASE3_AUTOMATION_QUIZ',
    description: 'Phase 3 Verification Quiz',
    category: 'javascript',
    difficulty: 'beginner',
    pointsReward: 10,
    xpReward: 20,
    questions: [
      {
        questionText: 'Which symbol is used for comments in JavaScript?',
        options: [
          { id: 'A', text: '// single line' },
          { id: 'B', text: '# hash comment' },
          { id: 'C', text: '<!-- html comment -->' },
          { id: 'D', text: '% percent comment' },
        ],
        correctOption: 'A',
        explanation: 'JavaScript uses // for single-line comments and /* */ for multi-line comments.',
      },
    ],
  });

  // Mark active
  await publishQuiz(createdQuiz.id, {
    messageId: 'mock_msg_987654',
    channelId: 'mock_chan_987654',
  });
  console.log(`   ✅ Test quiz created and published (ID: ${createdQuiz.id}).`);

  // Submit Correct Answer
  console.log('4️⃣ Submitting answer (Option A - Correct)...');
  const attemptResult = await submitQuizAttempt({
    quizId: createdQuiz.id,
    discordId: TEST_DISCORD_USER,
    selectedOption: 'A',
  });

  if (!attemptResult.is_correct) {
    throw new Error('Expected answer A to be marked correct!');
  }
  if (attemptResult.points_awarded !== 10 || attemptResult.xp_awarded !== 20) {
    throw new Error(`Expected 10 points & 20 XP, got ${attemptResult.points_awarded} pts / ${attemptResult.xp_awarded} XP.`);
  }
  console.log(`   ✅ Correct answer processed! Points: +${attemptResult.points_awarded}, XP: +${attemptResult.xp_awarded}`);

  // Test Duplicate Prevention
  console.log('5️⃣ Testing duplicate submission rejection...');
  let duplicateCaught = false;
  try {
    await submitQuizAttempt({
      quizId: createdQuiz.id,
      discordId: TEST_DISCORD_USER,
      selectedOption: 'B',
    });
  } catch (err) {
    if (err.message === 'DUPLICATE_ATTEMPT' || err.code === '23505' || err.message?.includes('duplicate key')) {
      duplicateCaught = true;
    }
  }

  if (!duplicateCaught) {
    throw new Error('Duplicate submission was NOT blocked!');
  }
  console.log('   ✅ Duplicate attempt strictly rejected by unique database constraint.\n');

  // Verify Member State
  const finalMember = await getMemberByDiscordId(TEST_DISCORD_USER);
  console.log(`6️⃣ Verifying member profile stats:`);
  console.log(`   • Total Points: ${finalMember.total_points}`);
  console.log(`   • Total XP:     ${finalMember.total_xp}`);
  console.log(`   • Quizzes Won:  ${finalMember.quizzes_won}/${finalMember.quizzes_completed}`);
  console.log(`   • Streak:       ${finalMember.streak_current} day(s)`);

  // Cleanup Test Data
  console.log('\n7️⃣ Cleaning up test records...');
  await supabaseAdmin.from('quiz_attempts').delete().eq('discord_id', TEST_DISCORD_USER);
  await supabaseAdmin.from('points_history').delete().eq('discord_id', TEST_DISCORD_USER);
  await supabaseAdmin.from('quizzes').delete().eq('id', createdQuiz.id);
  await supabaseAdmin.from('members').delete().eq('discord_id', TEST_DISCORD_USER);
  console.log('   ✅ Test records purged completely.');

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  🎉 Phase 3 Daily Quiz Engine: ALL TESTS PASSED!');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('\n❌ Quiz Engine Test Failed:', err);
  process.exit(1);
});
