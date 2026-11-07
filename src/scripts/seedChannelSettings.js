/**
 * src/scripts/seedChannelSettings.js
 * Seeds / upserts all HCC channel configurations into engagement_channel_settings.
 *
 * Run once (or anytime channel IDs change) to register channels:
 *   node --env-file=.env src/scripts/seedChannelSettings.js
 *
 * This script is SAFE to re-run — it uses UPSERT (no duplicates created).
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

/**
 * Channel registry — add any new channels here.
 * multiplier : XP/points multiplier for messages in that channel
 * category   : engagement category label (affects leaderboard weighting)
 */
function buildChannelRegistry() {
  const quizId        = process.env.DISCORD_QUIZ_CHANNEL_ID;
  const generalId     = process.env.DISCORD_GENERAL_CHANNEL_ID;
  const announcId     = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
  const leaderboardId = process.env.DISCORD_LEADERBOARD_CHANNEL_ID;
  const logsId        = process.env.DISCORD_LOGS_CHANNEL_ID;
  const testId        = process.env.TEST_CHANNEL_ID;

  const channels = [];

  if (quizId && !quizId.startsWith('your_')) {
    channels.push({
      channel_id:   quizId,
      channel_name: 'autoengage-testing (Quiz)',
      category:     'learning',
      multiplier:   1.5,   // Quiz/learning channels get a 1.5× boost
      is_enabled:   true,
      notes:        'Primary daily quiz & challenge channel — 15s timed sessions',
    });
  }

  if (generalId && !generalId.startsWith('your_')) {
    channels.push({
      channel_id:   generalId,
      channel_name: 'general',
      category:     'general',
      multiplier:   1.0,   // Standard multiplier for general discussion
      is_enabled:   true,
      notes:        'Main community general discussion channel',
    });
  }

  if (announcId && !announcId.startsWith('your_')) {
    channels.push({
      channel_id:   announcId,
      channel_name: 'announcements',
      category:     'announcement',
      multiplier:   0.5,   // Reactions still count but posting is restricted
      is_enabled:   true,
      notes:        'Announcements channel — read-only for most members, reactions tracked',
    });
  }

  if (leaderboardId && !leaderboardId.startsWith('your_')) {
    channels.push({
      channel_id:   leaderboardId,
      channel_name: 'leaderboard',
      category:     'announcement',
      multiplier:   0.25,
      is_enabled:   true,
      notes:        'Leaderboard display channel',
    });
  }

  if (logsId && !logsId.startsWith('your_')) {
    channels.push({
      channel_id:   logsId,
      channel_name: 'bot-logs',
      category:     'admin',
      multiplier:   0.0,   // No engagement points from admin log channels
      is_enabled:   false,
      notes:        'Internal bot activity log channel — engagement disabled',
    });
  }

  if (testId && !testId.startsWith('your_') && testId !== quizId) {
    channels.push({
      channel_id:   testId,
      channel_name: 'autoengage-testing',
      category:     'learning',
      multiplier:   1.5,
      is_enabled:   true,
      notes:        'Development / testing channel',
    });
  }

  return channels;
}

async function main() {
  const channels = buildChannelRegistry();

  if (channels.length === 0) {
    console.warn('⚠️  No configured channel IDs found in .env — nothing to seed.');
    console.warn('   Set DISCORD_QUIZ_CHANNEL_ID and DISCORD_GENERAL_CHANNEL_ID in .env first.');
    process.exit(0);
  }

  console.log(`\n📡  Seeding ${channels.length} channel(s) into engagement_channel_settings…\n`);

  for (const ch of channels) {
    const { data, error } = await supabase
      .from('engagement_channel_settings')
      .upsert(
        { ...ch, updated_at: new Date().toISOString() },
        { onConflict: 'channel_id' }
      )
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed: #${ch.channel_name} (${ch.channel_id}) — ${error.message}`);
    } else {
      const status = ch.is_enabled ? '✅ enabled' : '⛔ disabled';
      console.log(`  ${status}  #${data.channel_name}  │  category: ${data.category}  │  ${data.multiplier}× multiplier`);
    }
  }

  console.log('\n✅  Channel settings seeded successfully!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

