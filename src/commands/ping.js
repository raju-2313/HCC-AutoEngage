/**
 * src/commands/ping.js
 * /ping – Tests bot responsiveness and reports round-trip latency.
 */

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check if the bot is online and measure round-trip latency.');

export async function execute(interaction) {
  // Defer so we can include the actual round-trip time
  const sent = await interaction.reply({ content: '🏓 Measuring…', fetchReply: true, flags: MessageFlags.Ephemeral });

  const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
  const wsHeartbeat = interaction.client.ws.ping;

  const embed = successEmbed(
    'Pong!',
    [
      `**Round-trip latency:** ${roundTrip} ms`,
      `**WebSocket heartbeat:** ${wsHeartbeat} ms`,
      `**Bot status:** Online ✅`,
    ].join('\n')
  );

  await interaction.editReply({ content: '', embeds: [embed] });
}

