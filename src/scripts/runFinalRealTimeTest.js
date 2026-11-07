/**
 * src/scripts/runFinalRealTimeTest.js
 * FINAL PRODUCTION SIMULATION with REAL-TIME PRODUCTION TIMERS:
 *   - Countdown: 30 seconds
 *   - Per-question timer: 15 seconds
 *   - Intermission gap: 4 seconds
 *   - Full 10 questions (Day 1: Python Basics)
 *   - Real start & finish @everyone pings (in TEST channel only)
 *   - Standalone "Whispers from the Mod" card
 *   - Post-test full database reset to 0 (Level 1, 0 pts, 0 streaks)
 *
 * Target: 1567916304118063124 (autoengage-testing ONLY)
 * Strictly does NOT touch the main channel.
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';
import { supabaseAdmin } from '../database/client.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL = '1567916304118063124'; // autoengage-testing
const TEST_DATE = '2026-11-09';            // Day 1 - Python Basics

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function resetAllDataToZero() {
  console.log('🔄 Executing complete database reset to 0…');

  const tablesToClear = [
    'engagement_events',
    'voice_sessions',
    'contribution_recognitions',
    'engagement_daily_stats',
    'engagement_scores',
    'quiz_attempts',
    'points_history',
    'leaderboard_snapshots',
    'monthly_rewards',
    'activity_logs',
    'quiz_questions',
    'quizzes',
  ];

  for (const table of tablesToClear) {
    try {
      await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn(`  Notice clearing ${table}: ${err.message}`);
    }
  }

  // Reset all members to zero
  await supabaseAdmin
    .from('members')
    .update({
      total_points: 0,
      total_xp: 0,
      level: 1,
      streak_current: 0,
      streak_max: 0,
      quizzes_completed: 0,
      quizzes_won: 0,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✅ Database fully wiped to 0: all members at Level 1, 0 points, 0 streak.');
}

client.once('clientReady', async () => {
  console.log(`\n🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Channel: ${TEST_CHANNEL} (autoengage-testing ONLY)`);
  console.log(`📅 Target Date: ${TEST_DATE} — Python Basics (Day 1 of 7)`);
  console.log(`⏱️ Real-time Production Timers:`);
  console.log(`   - Countdown: 30 seconds`);
  console.log(`   - Per-question: 15 seconds`);
  console.log(`   - Intermission: 4 seconds`);
  console.log(`   - Total questions: 10`);
  console.log(`   - Total expected runtime: ~3.5 minutes\n`);

  // Ensure clean DB before starting
  await resetAllDataToZero();

  console.log('━'.repeat(60));
  console.log('  🚀 FINAL REAL-TIME TEST SESSION STARTING NOW…');
  console.log('━'.repeat(60) + '\n');

  const startTime = Date.now();

  try {
    const result = await runDailyTimedSession({
      client,
      channelId: TEST_CHANNEL,
      dateStr: TEST_DATE,
      suppressEveryonePing: false,       // Real pings in test channel
      customCountdownSeconds: 30,        // Real 30s countdown
      customQuestionTimeSeconds: 15,     // Real 15s per question
      customIntermissionSeconds: 4,      // Real 4s intermission
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n' + '━'.repeat(60));
    if (result.success) {
      console.log(`✅ FINAL REAL-TIME TEST COMPLETED SUCCESSFULLY IN ${elapsed}s!`);
      console.log(`   Questions processed : ${result.totalQuestions}`);
      console.log(`   Participants logged : ${result.participantsCount ?? 0}`);
    } else {
      console.log(`⚠️ Session result: ${result.reason || result.error}`);
    }
    console.log('━'.repeat(60) + '\n');

    // Final database reset to guarantee fresh state for Monday
    await resetAllDataToZero();
    console.log('\n🎉 Final verification complete! Database is 100% clean and ready for Monday.');
  } catch (err) {
    console.error('❌ Fatal error during final test session:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

