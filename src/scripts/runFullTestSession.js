/**
 * src/scripts/runFullTestSession.js
 * Runs the COMPLETE 10-question Day 1 session in the TEST channel.
 * Identical to what fires Monday 09:00 AM IST — zero shortcuts.
 *
 * Uses test channel: 1567916304118063124
 * Does NOT touch main quiz channel: 1538470672722952303
 *
 * Total runtime: ~3.5 minutes (10s countdown + 10×15s questions + 9×4s gaps + final)
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';

const TOKEN        = process.env.DISCORD_TOKEN;
const TEST_CHANNEL = '1567916304118063124';
const TEST_DATE    = '2026-11-09';   // Day 1 — Python Basics

if (!TOKEN) { console.error('❌  DISCORD_TOKEN missing'); process.exit(1); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`\n🤖  Bot ready: ${client.user.tag}`);
  console.log(`📡  Channel  : ${TEST_CHANNEL} (autoengage-testing — NOT main channel)`);
  console.log(`📅  Date     : ${TEST_DATE} — Python Basics (Day 1/7)`);
  console.log(`⏱️   Timer    : 15s per question | 10s countdown | 4s between questions`);
  console.log(`📋  Questions: 10 (full set — no shortcuts)`);
  console.log(`\n${'━'.repeat(60)}`);
  console.log('  🚀  FULL SESSION STARTING NOW…');
  console.log(`${'━'.repeat(60)}\n`);

  const startTime = Date.now();

  const result = await runDailyTimedSession({
    client,
    channelId: TEST_CHANNEL,
    dateStr: TEST_DATE,
    suppressEveryonePing: false,       // Real @everyone pings exactly like production
    customCountdownSeconds: 10,        // 10s for test (production uses 30s)
    customQuestionTimeSeconds: 15,     // Real 15s per question
  });

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n${'━'.repeat(60)}`);
  if (result.success) {
    console.log(`✅  FULL SESSION COMPLETE (${elapsed}s total)`);
    console.log(`   Participants : ${result.participantsCount ?? 0}`);
    console.log(`   Questions    : ${result.totalQuestions}`);
  } else {
    console.log(`⚠️  Session result: ${result.reason || result.error}`);
  }
  console.log(`${'━'.repeat(60)}\n`);

  client.destroy();
  process.exit(0);
});

client.login(TOKEN);

