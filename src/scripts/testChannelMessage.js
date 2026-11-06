/**
 * src/scripts/testChannelMessage.js
 * Sends a temporary verification message to confirm the bot can post in the designated channel.
 */

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { config } from '../config/index.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function main() {
  const token = config.discord.token?.trim().replace(/^["']|["']$/g, '');
  await client.login(token);

  const channelId = config.discord.channels.quiz || '1538470672722952303';
  const channel = await client.channels.fetch(channelId).catch((err) => {
    console.error(`Fetch error for channel ${channelId}:`, err.message);
    return null;
  });

  if (!channel) {
    console.error(`❌ Channel ${channelId} could not be accessed by the bot.`);
    console.error('Make sure the bot has "View Channel" and "Send Messages" permissions in this channel.');
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setColor(0x00FF88)
    .setTitle('🧪 HCC AutoEngage – Channel Test')
    .setDescription(
      `✅ **Connection verified!**\n\n` +
      `The bot has write access to <#${channelId}>.\n` +
      `Daily challenges starting tomorrow (**09:00 AM IST**) will automatically post here.\n\n` +
      `*(You can delete this message now)*`
    )
    .setFooter({ text: 'HCC AutoEngage • Pre-Launch Check' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  console.log(`✅ Success! Test message sent to #${channel.name} (${channelId}). Message ID: ${msg.id}`);

  client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running channel test:', err);
  process.exit(1);
});

