/**
 * src/scripts/runTestSession.js
 * Fires a SINGLE-QUESTION preview of Day 1 (Python Basics) in the TEST channel.
 *
 * Shows the FULL real flow:
 *   1. @everyone announcement embed with countdown
 *   2. Question embed with A/B/C/D buttons and 15s live timer
 *   3. Answer reveal with explanation and accuracy stats
 *   4. Final results embed with @everyone wrap-up ping
 *
 * Runs ONLY in test channel — does NOT touch the main quiz channel.
 *
 * Usage:  node --env-file=.env src/scripts/runTestSession.js
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';
import { getDayQuestionSet } from '../services/quiz/sessionQuestionManager.js';
import { logger } from '../utils/logger.js';

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN       = process.env.DISCORD_TOKEN;
const TEST_CHANNEL = '1567916304118063124';  // autoengage-testing channel
const TEST_DATE   = '2026-11-09';            // Day 1 — Python Basics

if (!TOKEN) {
  console.error('❌  DISCORD_TOKEN missing from .env');
  process.exit(1);
}

// ── Patch: inject singleQuestionTest flag so only Q1 runs ─────────────────────
// This avoids a 2.5-minute full run during testing.
// The patch is in-memory only — the JSON bank file is NOT modified.
const originalGetDayQuestionSet = getDayQuestionSet;
import { CHALLENGE_CALENDAR } from '../services/quiz/sessionQuestionManager.js';
const originalMeta = CHALLENGE_CALENDAR[TEST_DATE];
if (originalMeta) {
  originalMeta.singleQuestionTest = true;
  console.log('🔧  Single-question test mode ACTIVE (Q1 only — full flow preserved)');
}

// ── Discord client ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`\n🤖  Logged in as ${client.user.tag}`);
  console.log(`📡  Target channel: ${TEST_CHANNEL} (autoengage-testing)`);
  console.log(`📅  Using question bank: ${TEST_DATE} — ${originalMeta?.topic}`);
  console.log(`⏱️   Timer: 15s per question | Countdown: 10s\n`);
  console.log('━'.repeat(52));
  console.log('  Launching test session now…');
  console.log('━'.repeat(52) + '\n');

  try {
    const result = await runDailyTimedSession({
      client,
      channelId: TEST_CHANNEL,
      dateStr: TEST_DATE,
      suppressEveryonePing: false,       // Show the real @everyone ping
      customCountdownSeconds: 10,        // 10s countdown for test (normally 30s)
      customQuestionTimeSeconds: 15,     // Real 15s timer
    });

    console.log('\n' + '━'.repeat(52));
    if (result.success) {
      console.log('✅  Test session completed successfully!');
      console.log(`   Participants this run : ${result.participantsCount ?? 0}`);
    } else {
      console.log(`⚠️  Session ended: ${result.reason || result.error}`);
    }
    console.log('━'.repeat(52) + '\n');
  } catch (err) {
    console.error('❌  Fatal error during test session:', err.message);
  } finally {
    // Clean up: remove singleQuestionTest patch so live bot is unaffected
    if (originalMeta) delete originalMeta.singleQuestionTest;
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

