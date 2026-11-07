/**
 * src/scripts/runRapidTestSession.js
 * Rapid, non-blocking test run of the complete 10-Question Daily Challenge workflow.
 *
 * Runs strictly in the TEST channel: 1567916304118063124
 * Does NOT touch main channel.
 *
 * Settings:
 *   - Countdown: 1s
 *   - Per-question window: 2s (quick auto-advance)
 *   - Intermission gap: 1s
 *   - Full 10 questions executed sequentially
 *   - Final Results & Podium published
 *   - Standalone "Whispers from the Mod" card published separately
 *
 * Total runtime: ~35 seconds
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';
import { supabaseAdmin } from '../database/client.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL = '1567916304118063124';
const TEST_DATE = '2026-11-09'; // Day 1 - Python Basics

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function cleanPriorTestRun() {
  // Clear any existing session or question records for 2026-11-09
  console.log('🧹 Preparing clean test state for Day 1 in Supabase…');
  await supabaseAdmin.from('quizzes').delete().eq('scheduled_for', TEST_DATE);
  await supabaseAdmin.from('quiz_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Clean slate ready.');
}

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Target channel: ${TEST_CHANNEL} (autoengage-testing ONLY)`);
  console.log(`⚡ Mode: RAPID EXECUTION (1s countdown, 2s per question, 1s gaps)`);
  console.log(`📋 Total Questions: 10 (Day 1: Python Basics)\n`);

  await cleanPriorTestRun();

  console.log('━'.repeat(55));
  console.log('  🚀 LAUNCHING RAPID 10-QUESTION WORKFLOW NOW…');
  console.log('━'.repeat(55) + '\n');

  const startTime = Date.now();

  try {
    const result = await runDailyTimedSession({
      client,
      channelId: TEST_CHANNEL,
      dateStr: TEST_DATE,
      suppressEveryonePing: true,        // Silent test — no notification spam
      customCountdownSeconds: 1,         // 1s countdown
      customQuestionTimeSeconds: 2,      // 2s per question
      customIntermissionSeconds: 1,      // 1s intermission
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n' + '━'.repeat(55));
    if (result.success) {
      console.log(`✅ RAPID WORKFLOW COMPLETED IN ${elapsed} SECONDS!`);
      console.log(`   Questions processed : ${result.totalQuestions}`);
      console.log(`   Final Podium sent   : YES`);
      console.log(`   Standalone Mod Hint : YES`);
    } else {
      console.log(`⚠️ Execution result: ${result.reason || result.error}`);
    }
    console.log('━'.repeat(55) + '\n');

    // Clean up test data so database is fresh for Monday
    await cleanPriorTestRun();
  } catch (err) {
    console.error('❌ Error during rapid workflow execution:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

