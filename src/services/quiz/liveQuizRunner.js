/**
 * src/services/quiz/liveQuizRunner.js
 * Automated Timer-Based Live Community Quiz Session Runner.
 *
 * Runs a multi-question test (e.g. 10 questions) in a public channel.
 * Advances through questions automatically on a countdown timer, reveals explanations,
 * and posts a live session leaderboard at the end!
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/embeds.js';
import { createQuiz, publishQuiz, closeQuiz } from '../../database/queries/quizzes.js';
import { getRandomSampleQuestions } from './questionBank.js';
import { supabaseAdmin } from '../../database/client.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a live timer-based quiz session in a channel.
 * @param {Object} options
 * @param {import('discord.js').Client} options.client
 * @param {string} options.channelId
 * @param {number} [options.questionCount=10]
 * @param {number} [options.secondsPerQuestion=25]
 */
export async function runLiveQuizSession({
  client,
  channelId,
  questionCount = 10,
  secondsPerQuestion = 25,
}) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found or inaccessible by the bot.`);
  }

  const sampleQuestions = getRandomSampleQuestions(questionCount);
  logger.info('Starting live quiz session', {
    channelId,
    questionCount: sampleQuestions.length,
    secondsPerQuestion,
  });

  // Track session scores in memory: Map<discordId, { username, score, correctCount }>
  const sessionScores = new Map();

  // ── 1. Announcement ─────────────────────────────────────────────────────────
  const introEmbed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🚀 Live Community Tech Quiz Starting!')
    .setDescription(
      `Welcome to the **HCC Live Tech Challenge**!\n\n` +
      `• **Total Questions:** ${sampleQuestions.length}\n` +
      `• **Time per Question:** ${secondsPerQuestion} seconds\n` +
      `• **Scoring:** Points & XP for correct answers + Live Podium at the end!\n\n` +
      `Get ready! Question 1 starts in **5 seconds**...`
    )
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' })
    .setTimestamp();

  await channel.send({ embeds: [introEmbed] });
  await sleep(5000);

  // ── 2. Loop Through Questions ──────────────────────────────────────────────
  for (let i = 0; i < sampleQuestions.length; i++) {
    const qData = sampleQuestions[i];
    const qNumber = i + 1;
    const totalQ = sampleQuestions.length;

    // A. Create & publish quiz record in Supabase
    const createdQuiz = await createQuiz({
      title: `Live Session Q${qNumber}: ${qData.title}`,
      description: `Live Quiz Question ${qNumber} of ${totalQ}`,
      category: qData.category,
      difficulty: qData.difficulty,
      pointsReward: qData.pointsReward,
      xpReward: qData.xpReward,
      createdBy: 'live_session',
      questions: [
        {
          questionText: qData.questionText,
          codeSnippet: qData.codeSnippet,
          options: qData.options,
          correctOption: qData.correctOption,
          explanation: qData.explanation,
        },
      ],
    });

    // Calculate countdown unix timestamp for Discord relative time tag <t:unix:R>
    const endTime = Date.now() + secondsPerQuestion * 1000;
    const unixEnd = Math.floor(endTime / 1000);

    // Format options
    const optionsText = qData.options
      .map((opt) => `**${opt.id})** ${opt.text}`)
      .join('\n\n');

    let desc = `${qData.questionText}\n\n`;
    if (qData.codeSnippet) {
      desc += `\`\`\`javascript\n${qData.codeSnippet}\n\`\`\`\n`;
    }
    desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${optionsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const qEmbed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`❓ Question ${qNumber} of ${totalQ}: ${qData.title}`)
      .setDescription(desc)
      .addFields(
        { name: '⏳ Time Remaining', value: `<t:${unixEnd}:R>`, inline: true },
        { name: '🎯 Difficulty', value: qData.difficulty === 'advanced' ? '🔥 Advanced' : '🌱 Beginner', inline: true },
        { name: '🎁 Stakes', value: `+${qData.pointsReward} Pts / +${qData.xpReward} XP`, inline: true }
      )
      .setFooter({ text: 'Click your option below! Answers are recorded privately.' })
      .setTimestamp();

    // 4 interactive buttons
    const activeButtons = qData.options.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`quiz_ans:${createdQuiz.id}:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(activeButtons);

    const message = await channel.send({
      embeds: [qEmbed],
      components: [row],
    });

    // Mark quiz active in Supabase
    await publishQuiz(createdQuiz.id, {
      messageId: message.id,
      channelId: channel.id,
    });

    // B. Wait for the countdown timer
    await sleep(secondsPerQuestion * 1000);

    // C. Close quiz in Supabase so no late submissions are accepted
    await closeQuiz(createdQuiz.id);

    // D. Fetch attempts submitted during this question to build statistics
    const { data: attempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select('discord_id, selected_option, is_correct, points_awarded, members(username)')
      .eq('quiz_id', createdQuiz.id);

    const totalSubmissions = attempts?.length || 0;
    const correctSubmissions = attempts?.filter((a) => a.is_correct) || [];

    // Update session scoreboard
    if (attempts) {
      for (const att of attempts) {
        const userId = att.discord_id;
        const username = att.members?.username || userId;
        const current = sessionScores.get(userId) || { username, score: 0, correctCount: 0 };
        current.username = username;
        if (att.is_correct) {
          current.score += att.points_awarded;
          current.correctCount += 1;
        }
        sessionScores.set(userId, current);
      }
    }

    // E. Edit question message to disable buttons
    const disabledButtons = qData.options.map((opt) => {
      const isCorrectOpt = opt.id === qData.correctOption;
      return new ButtonBuilder()
        .setCustomId(`quiz_closed:${createdQuiz.id}:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(isCorrectOpt ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true);
    });
    const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

    const resultEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`⏰ Time's Up! Question ${qNumber} of ${totalQ} Results`)
      .setDescription(
        `**Correct Answer:** Option **${qData.correctOption}**\n\n` +
        `**💡 Educational Explanation:**\n${qData.explanation}\n\n` +
        `📊 **Stats:** ${correctSubmissions.length} of ${totalSubmissions} participant(s) answered correctly.`
      )
      .setFooter({
        text: qNumber < totalQ ? `Next question in 5 seconds...` : `Calculating final scores...`,
      });

    await message.edit({
      embeds: [qEmbed, resultEmbed],
      components: [disabledRow],
    }).catch(() => {});

    // Intermission before next question
    if (qNumber < totalQ) {
      await sleep(5000);
    }
  }

  // ── 3. Final Session Leaderboard ───────────────────────────────────────────
  await sleep(2000);

  const sortedLeaderboard = Array.from(sessionScores.values()).sort(
    (a, b) => b.score - a.score || b.correctCount - a.correctCount
  );

  let leaderboardText = '';
  if (sortedLeaderboard.length === 0) {
    leaderboardText = 'No participants submitted answers during this session.';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    leaderboardText = sortedLeaderboard
      .slice(0, 10)
      .map((entry, idx) => {
        const medal = medals[idx] || `**#${idx + 1}**`;
        return `${medal} **${entry.username}** — **${entry.score} Points** (${entry.correctCount}/${sampleQuestions.length} correct)`;
      })
      .join('\n\n');
  }

  const finalPodiumEmbed = new EmbedBuilder()
    .setColor(0xFFD700) // Gold
    .setTitle('🏆 Live Quiz Session Complete! Podium & Results')
    .setDescription(
      `Great job to all participants in today’s **HCC 10-Question Tech Challenge**!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**Final Standings:**\n\n${leaderboardText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Points and streaks have been recorded to your permanent community profile. Use \`/quiz stats\` to view your progress!`
    )
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' })
    .setTimestamp();

  await channel.send({ embeds: [finalPodiumEmbed] });

  logger.info('Live quiz session completed successfully', {
    channelId,
    totalQuestions: sampleQuestions.length,
    participants: sessionScores.size,
  });

  return { totalQuestions: sampleQuestions.length, participants: sessionScores.size };
}
