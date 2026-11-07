/**
 * src/scripts/testChannelPing.js
 * Sends a test embed to the main quiz channel and auto-deletes it after 10 seconds.
 * Run: node --env-file=.env src/scripts/testChannelPing.js
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const TOKEN      = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_QUIZ_CHANNEL_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN || !CHANNEL_ID) {
  console.error('❌ DISCORD_TOKEN or DISCORD_QUIZ_CHANNEL_ID missing.');
  process.exit(1);
}

// 1. Update channel settings in Supabase
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function updateChannelSettings() {
  const { error } = await supabase
    .from('engagement_channel_settings')
    .upsert({
      channel_id:   CHANNEL_ID,
      channel_name: 'general (Main Quiz Channel)',
      category:     'learning',
      multiplier:   1.5,
      is_enabled:   true,
      notes:        'Main community quiz & engagement channel — daily 15s timed sessions fire here',
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'channel_id' });

  if (error) {
    console.error('⚠️  Supabase update warning:', error.message);
  } else {
    console.log('✅  Channel settings updated in Supabase → category: learning | 1.5× multiplier');
  }
}

// 2. Send test message
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`🤖  Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) throw new Error(`Channel ${CHANNEL_ID} not found.`);

    const embed = new EmbedBuilder()
      .setColor(0x00C853)
      .setTitle('🟢  HCC AutoEngage — Channel Verified!')
      .setDescription(
        '> This channel is now configured as the **main HCC quiz & engagement channel**.\n\n' +
        '`✅`  Bot has full access to this channel\n' +
        '`✅`  Daily quizzes will fire here at **09:00 AM IST**\n' +
        '`✅`  Engagement scoring active — messages, reactions & voice tracked\n' +
        '`✅`  Question timer: **15 seconds** per question\n\n' +
        '> _This message will self-destruct in **10 seconds**._'
      )
      .setFooter({ text: 'HCC AutoEngage • Configuration Test  │  Auto-deleting in 10s' })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    console.log(`📨  Test message sent (ID: ${msg.id}) — deleting in 10 seconds…`);

    setTimeout(async () => {
      await msg.delete().catch(() => {});
      console.log('🗑️   Message deleted.');
      client.destroy();
      process.exit(0);
    }, 10_000);

  } catch (err) {
    console.error('❌  Error:', err.message);
    client.destroy();
    process.exit(1);
  }
});

// Run both in parallel, then login
await updateChannelSettings();
client.login(TOKEN);

