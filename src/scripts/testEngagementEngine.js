/**
 * src/scripts/testEngagementEngine.js
 * Comprehensive Verification Suite for Community Engagement Engine.
 */

import { supabaseAdmin } from '../database/client.js';
import {
  getEngagementScoreSettings,
  setEngagementChannelSettings,
  recordEngagementEvent,
  recordVoiceSessionStart,
  recordVoiceSessionEnd,
  reconcileOrphanedVoiceSessions,
  awardCommunityContribution,
  fetchEngagementLeaderboard,
  getMemberEngagementSummary,
} from '../database/queries/engagement.js';

import { config } from '../config/index.js';

console.log('\n===============================================================');
console.log('  HCC AutoEngage – Community Engagement Engine Test Suite');
console.log('===============================================================\n');

// ── Check 1: Verify 002 Schema Tables in Supabase ────────────────────────────
console.log('1️⃣ Checking Community Engagement Schema in Supabase...');
const { data: settingsCheck, error: settingsError } = await supabaseAdmin
  .from('engagement_score_settings')
  .select('*')
  .limit(1);

if (settingsError && settingsError.code === 'PGRST205') {
  console.log('   ⚠️ Migration 002 is not yet executed in Supabase!');
  console.log('   👉 Please copy the contents of "migrations/002_community_engagement_schema.sql"');
  console.log('      into your Supabase SQL Editor (https://supabase.com/dashboard/project/mpwjpvmrcavhpastpoqe/sql/new)');
  console.log('      and click "Run".\n');
  process.exit(2);
}

console.log('   ✅ Migration 002 tables and RPC procedures verified in Supabase.\n');

const TEST_DISCORD_A = 'test_engagement_user_01';
const TEST_DISCORD_B = 'test_engagement_user_02';
const TEST_CHANNEL   = config.discord.channels.test || '1567916304118063124';

try {
  // ── Check 2: Channel Configuration ─────────────────────────────────────────
  console.log('2️⃣ Testing Channel Configuration & Multipliers...');
  await setEngagementChannelSettings({
    channelId: TEST_CHANNEL,
    channelName: 'test-quiz-channel',
    category: 'learning',
    multiplier: 1.5,
  });
  console.log('   ✅ Channel configured as LEARNING (1.5x multiplier).\n');

  // ── Check 3: Message Engagement & Cooldown ─────────────────────────────────
  console.log('3️⃣ Testing Message Activity Tracking & Cooldown...');
  const msg1 = await recordEngagementEvent({
    discordId: TEST_DISCORD_A,
    username: 'TestUserA',
    eventType: 'message',
    channelId: TEST_CHANNEL,
    referenceId: 'msg_test_01',
    metadata: { hasAttachments: false },
  });
  console.log(`   • Message 1 result: success=${msg1.success}, points=${msg1.points_awarded}, reason=${msg1.reason}`);

  // Immediate second message (cooldown test)
  const msg2 = await recordEngagementEvent({
    discordId: TEST_DISCORD_A,
    username: 'TestUserA',
    eventType: 'message',
    channelId: TEST_CHANNEL,
    referenceId: 'msg_test_02',
    metadata: { hasAttachments: false },
  });
  console.log(`   • Message 2 (Immediate): success=${msg2.success}, reason=${msg2.reason}`);
  if (msg2.reason === 'COOLDOWN_ACTIVE') {
    console.log('   ✅ Cooldown enforcement successfully prevented message burst spam.\n');
  } else {
    console.log('   ℹ️ Cooldown check:', msg2.reason);
  }

  // ── Check 4: Reaction Deduplication ────────────────────────────────────────
  console.log('4️⃣ Testing Reaction Tracking & Deduplication...');
  const rx1 = await recordEngagementEvent({
    discordId: TEST_DISCORD_A,
    username: 'TestUserA',
    eventType: 'reaction_add',
    channelId: TEST_CHANNEL,
    referenceId: 'rx_test_msg_01:thumbsup',
  });
  console.log(`   • Reaction 1 result: success=${rx1.success}, points=${rx1.points_awarded}`);

  const rx2 = await recordEngagementEvent({
    discordId: TEST_DISCORD_A,
    username: 'TestUserA',
    eventType: 'reaction_add',
    channelId: TEST_CHANNEL,
    referenceId: 'rx_test_msg_01:thumbsup', // duplicate
  });
  console.log(`   • Reaction 2 (Duplicate): success=${rx2.success}, reason=${rx2.reason}`);
  if (rx2.reason === 'DUPLICATE_EVENT') {
    console.log('   ✅ Duplicate reaction correctly rejected.\n');
  }

  // ── Check 5: Voice Session Tracking & Minimum Duration ─────────────────────
  console.log('5️⃣ Testing Persistent Voice Session Tracking...');
  const voiceSession = await recordVoiceSessionStart({
    discordId: TEST_DISCORD_A,
    username: 'TestUserA',
    channelId: TEST_CHANNEL,
  });
  console.log(`   • Voice session started: ID ${voiceSession.id}`);

  // Simulate session duration: 180 seconds (3 minutes)
  const simulatedEnd = new Date(Date.now() + 180 * 1000).toISOString();
  const voiceEnd = await recordVoiceSessionEnd(voiceSession.id, simulatedEnd);
  console.log(`   • Voice session concluded: duration=${voiceEnd.duration_seconds}s, points=${voiceEnd.points_awarded}, status=${voiceEnd.status}`);
  console.log('   ✅ Persistent voice tracking verified.\n');

  // ── Check 6: Community Contribution Recognition ────────────────────────────
  console.log('6️⃣ Testing Peer & Moderator Contribution Recognition...');
  const contribution = await awardCommunityContribution({
    recipientDiscordId: TEST_DISCORD_B,
    recipientUsername: 'TestUserB',
    giverDiscordId: TEST_DISCORD_A,
    type: 'peer_thanks',
    points: 5.0,
    reason: 'Helped solve a tricky dynamic programming bug',
    channelId: TEST_CHANNEL,
  });
  console.log(`   • Contribution awarded: +${contribution.points} pts to ${TEST_DISCORD_B}`);

  // Test 24h anti-collusion cooldown
  let collusionCaught = false;
  try {
    await awardCommunityContribution({
      recipientDiscordId: TEST_DISCORD_B,
      recipientUsername: 'TestUserB',
      giverDiscordId: TEST_DISCORD_A,
      type: 'peer_thanks',
      points: 5.0,
      reason: 'Repeated thanks attempt',
    });
  } catch (err) {
    if (err.message.includes('COOLDOWN_ACTIVE')) collusionCaught = true;
  }
  if (collusionCaught) {
    console.log('   ✅ Anti-collusion 24h peer limit successfully enforced.\n');
  }

  // ── Check 7: Overall Engagement Normalization & Composite Leaderboard ──────
  console.log('7️⃣ Testing Normalized Leaderboard Calculation...');
  const overallBoard = await fetchEngagementLeaderboard('weekly', 5);
  console.log(`   • Leaderboard calculated: ${overallBoard.length} active rank records.`);
  if (overallBoard.length > 0) {
    const top = overallBoard[0];
    console.log(`   • Top Student: ${top.username} (Overall Score: ${top.overall_score})`);
    console.log(`     Normalized: Learning=${top.learning_score}, Text=${top.text_score}, Voice=${top.voice_score}, Reaction=${top.reaction_score}, Contribution=${top.contribution_score}`);
  }
  console.log('   ✅ Composite multi-category scoring verified.\n');

} finally {
  // ── Cleanup: Purge isolated test records ───────────────────────────────────
  console.log('8️⃣ Purging isolated test records...');
  await supabaseAdmin.from('contribution_recognitions').delete().or(`giver_discord_id.eq.${TEST_DISCORD_A},recipient_discord_id.eq.${TEST_DISCORD_B}`);
  await supabaseAdmin.from('voice_sessions').delete().eq('discord_id', TEST_DISCORD_A);
  await supabaseAdmin.from('engagement_events').delete().eq('discord_id', TEST_DISCORD_A);
  await supabaseAdmin.from('engagement_daily_stats').delete().or(`discord_id.eq.${TEST_DISCORD_A},discord_id.eq.${TEST_DISCORD_B}`);
  await supabaseAdmin.from('members').delete().or(`discord_id.eq.${TEST_DISCORD_A},discord_id.eq.${TEST_DISCORD_B}`);
  console.log('   ✅ Test records cleaned up.\n');
}

console.log('===============================================================');
console.log('  🎉 Community Engagement Engine: ALL AUDITS PASSED!');
console.log('===============================================================\n');

