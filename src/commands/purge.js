/**
 * src/commands/purge.js
 * /purge [amount] - Purges messages sent exclusively by this bot in the current channel.
 *
 * Restricted to administrators and HCC Moderators.
 */

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { errorEmbed, COLORS } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { logActivity } from '../database/queries/logs.js';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Purge messages sent exclusively by this bot in this channel (Admin only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((opt) =>
    opt
      .setName('amount')
      .setDescription('Number of bot messages to delete (1-100). Default is 50.')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false)
  );

/**
 * Core purge execution helper shared between /purge and /admin purge.
 */
export async function executePurge(interaction, targetAmount) {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) {
    return interaction.editReply({
      embeds: [errorEmbed('Invalid Channel', 'This command can only be used in text channels.')],
    });
  }

  const botId = interaction.client.user.id;
  let deletedCount = 0;
  let lastMessageId = null;
  const maxScanBatches = 8; // Scan up to 800 messages in history to locate bot messages
  let batchIndex = 0;

  try {
    while (deletedCount < targetAmount && batchIndex < maxScanBatches) {
      batchIndex++;
      const needed = targetAmount - deletedCount;
      const fetchLimit = Math.min(100, Math.max(20, needed * 2));
      const fetchOptions = { limit: fetchLimit };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const fetchedMessages = await channel.messages.fetch(fetchOptions).catch((err) => {
        logger.warn('Failed to fetch message batch for purge', { error: err.message });
        return null;
      });

      if (!fetchedMessages || fetchedMessages.size === 0) {
        break; // No more messages in channel history
      }

      lastMessageId = fetchedMessages.last().id;

      // Filter ONLY messages sent by THIS bot
      const botMessages = fetchedMessages.filter((m) => m.author.id === botId);

      if (botMessages.size === 0) {
        if (fetchedMessages.size < fetchLimit) break;
        continue;
      }

      const toDelete = Array.from(botMessages.values()).slice(0, needed);

      // Separate messages younger than 14 days (bulkDelete eligible) from older ones
      const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const bulkEligible = toDelete.filter((m) => m.createdTimestamp > fourteenDaysAgo);
      const manualEligible = toDelete.filter((m) => m.createdTimestamp <= fourteenDaysAgo);

      // Try bulk delete for recent messages if more than 1
      if (bulkEligible.length > 1) {
        try {
          const bulkResult = await channel.bulkDelete(bulkEligible, true);
          deletedCount += bulkResult.size;
        } catch (bulkErr) {
          logger.warn('Bulk delete failed, falling back to sequential delete', { error: bulkErr.message });
          for (const msg of bulkEligible) {
            await msg.delete().catch(() => null);
            deletedCount++;
          }
        }
      } else if (bulkEligible.length === 1) {
        await bulkEligible[0].delete().catch(() => null);
        deletedCount++;
      }

      // Delete older messages sequentially
      for (const msg of manualEligible) {
        await msg.delete().catch(() => null);
        deletedCount++;
      }

      if (toDelete.length < needed && fetchedMessages.size < fetchLimit) {
        break; // Reached beginning of channel
      }
    }

    // Log admin activity to Supabase
    await logActivity('admin_purge_bot_messages', interaction.user.id, {
      channelId: channel.id,
      channelName: channel.name,
      requestedAmount: targetAmount,
      deletedCount,
      adminUsername: interaction.user.username,
    }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🧹  Bot Messages Purged')
      .setDescription(
        `> Successfully deleted **${deletedCount}** message(s) sent by <@${botId}> in <#${channel.id}>.\n\n` +
        `**Details:**\n` +
        `• **Requested Amount:** \`${targetAmount}\`\n` +
        `• **Deleted Messages:** \`${deletedCount}\`\n` +
        `• **Scope:** Exclusively messages by <@${botId}>\n` +
        `• **Human Messages:** Untouched & intact ✅`
      )
      .setFooter({ text: `HCC AutoEngage • Admin action by @${interaction.user.username}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Error during purge execution', { error: err.message, stack: err.stack });
    return interaction.editReply({
      embeds: [errorEmbed('Purge Failed', `An error occurred while purging bot messages: ${err.message}`)],
    });
  }
}

export async function execute(interaction) {
  // 1. Strict Admin / Moderator Authorization Check
  if (!isAdmin(interaction)) {
    return interaction.reply({
      embeds: [errorEmbed('Permission Denied', 'Only administrators and HCC Moderators can use `/purge`.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2. Defer ephemerally so the command execution is silent to normal users
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const amount = interaction.options.getInteger('amount') || 50;
  return executePurge(interaction, amount);
}

