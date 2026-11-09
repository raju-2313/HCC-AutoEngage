/**
 * src/services/emojis/reviewService.js
 * Builds interactive administrator review embeds and handles emoji moderation buttons.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { COLORS } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { isStickerAdmin } from '../../utils/permissions.js';
import {
  getPendingEmojiCandidates,
  getEmojiCandidateById,
  getEmojiCandidatesByPackId,
  updateEmojiCandidateReviewStatus,
  updateEmojiPackReviewStatus,
} from '../../database/queries/emojis.js';
import { uploadApprovedEmojis, getGuildEmojiSlotInfo } from './uploadService.js';

/**
 * Builds the embed and button action rows for reviewing an emoji candidate.
 *
 * @param {Object} candidate
 * @param {Object} options
 * @param {number} [options.currentIndex=0]
 * @param {number} [options.totalCount=1]
 * @param {Object} [options.slotInfo]
 * @returns {{ embeds: Array<EmbedBuilder>, components: Array<ActionRowBuilder> }}
 */
export function buildEmojiReviewPayload(candidate, options = {}) {
  const { currentIndex = 0, totalCount = 1, slotInfo } = options;

  const slotSummary = slotInfo
    ? `${slotInfo.remainingStatic} / ${slotInfo.max} static slots free (${slotInfo.usedStatic} used)`
    : '50 free slots on standard servers';

  const embed = new EmbedBuilder()
    .setColor(COLORS.HCC_BLUE)
    .setTitle(`😀 Emoji Review: :${candidate.name}:`)
    .setDescription(
      `**Candidate ${currentIndex + 1} of ${totalCount}**\n` +
      `Review this non-vulgar emoji candidate. The bot will **never** upload without explicit administrator approval.`
    )
    .setThumbnail(candidate.preview_url)
    .addFields(
      { name: '📦 Pack Name', value: `${candidate.pack_name} (\`${candidate.pack_id}\`)`, inline: true },
      { name: '🏷️ Category', value: `\`${candidate.category}\``, inline: true },
      { name: '💾 Static Emoji Slots', value: slotSummary, inline: true },
      { name: '👤 Creator', value: candidate.creator || 'HCC Community', inline: true },
      { name: '📜 License', value: `\`${candidate.license}\``, inline: true },
      { name: '🔗 Source', value: `[View Source Asset](${candidate.source_url})`, inline: true },
      { name: '🔥 Trend / Context', value: candidate.trend_reason || 'Popular Gen Z reaction', inline: false }
    )
    .setFooter({ text: `ID: ${candidate.id} • Clean & Community Verified` })
    .setTimestamp();

  // Action Row 1: Candidate Actions + Navigation
  const candidateRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`emoji:approve:${candidate.id}`)
      .setLabel('Approve & Upload')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`emoji:reject:${candidate.id}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  if (totalCount > 1) {
    if (currentIndex > 0) {
      candidateRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`emoji:nav:${currentIndex - 1}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('◀️')
      );
    }
    if (currentIndex < totalCount - 1) {
      candidateRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`emoji:nav:${currentIndex + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('▶️')
      );
    }
  }

  // Action Row 2: Pack-level Actions
  const packRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`emoji:approve_pack:${candidate.pack_id}`)
      .setLabel(`Approve Entire Pack (${candidate.pack_name})`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📦'),
    new ButtonBuilder()
      .setCustomId(`emoji:reject_pack:${candidate.pack_id}`)
      .setLabel(`Reject Entire Pack`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🗑️')
  );

  return {
    embeds: [embed],
    components: [candidateRow, packRow],
  };
}

/**
 * Handles all button interactions starting with `emoji:`.
 * Strictly checks administrator authorization before taking action.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 */
export async function handleEmojiButtonInteraction(interaction) {
  // 1. Strict Security Check
  if (!isStickerAdmin(interaction)) {
    logger.warn('Unauthorized user attempted emoji moderation button', {
      user: interaction.user.tag,
      userId: interaction.user.id,
      customId: interaction.customId,
    });
    return interaction.reply({
      content: '⛔ **Access Denied**: You do not have permission to approve or reject emojis. This action is restricted to HCC administrators.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferUpdate();

  const parts = interaction.customId.split(':');
  const action = parts[1];
  const targetId = parts[2];

  try {
    // ─── Approve Single Emoji ────────────────────────────────────────────────
    if (action === 'approve') {
      const candidate = await getEmojiCandidateById(targetId);
      if (!candidate) {
        return interaction.editReply({
          content: `⚠️ Candidate \`${targetId}\` not found in database.`,
          embeds: [],
          components: [],
        });
      }

      await updateEmojiCandidateReviewStatus(candidate.id, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      // Upload to Discord
      const uploadResult = await uploadApprovedEmojis(interaction.guild, [candidate]);

      if (uploadResult.uploaded.length > 0) {
        const item = uploadResult.uploaded[0];
        const successEmbed = new EmbedBuilder()
          .setColor(COLORS.HCC_GREEN)
          .setTitle('✅ Emoji Approved & Uploaded!')
          .setDescription(`Custom emoji **:${candidate.name}:** has been added to the HCC Discord server!`)
          .setThumbnail(candidate.preview_url)
          .addFields(
            { name: 'Emoji ID', value: `\`${item.emoji.id}\``, inline: true },
            { name: 'Approved By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Remaining Slots', value: `${uploadResult.remainingSlots} free`, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [successEmbed], components: [] });
      }

      if (uploadResult.skippedSlots.length > 0) {
        return interaction.editReply({
          content: `⚠️ **Upload Skipped**: No static emoji slots remaining on this server! The emoji was marked as approved in DB but could not be uploaded.`,
          embeds: [],
          components: [],
        });
      }

      const failReason = uploadResult.failed[0]?.reason || 'Unknown error';
      return interaction.editReply({
        content: `❌ **Upload Failed**: ${failReason}`,
        embeds: [],
        components: [],
      });
    }

    // ─── Reject Single Emoji ────────────────────────────────────────────────
    if (action === 'reject') {
      const candidate = await getEmojiCandidateById(targetId);
      if (!candidate) {
        return interaction.editReply({
          content: `⚠️ Candidate \`${targetId}\` not found.`,
          embeds: [],
          components: [],
        });
      }

      await updateEmojiCandidateReviewStatus(candidate.id, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: 'Rejected during manual administrator review',
      });

      const rejectEmbed = new EmbedBuilder()
        .setColor(COLORS.HCC_RED)
        .setTitle('❌ Emoji Rejected')
        .setDescription(`Candidate **:${candidate.name}:** was rejected by <@${interaction.user.id}>. It will not be uploaded.`)
        .setThumbnail(candidate.preview_url)
        .setTimestamp();

      return interaction.editReply({ embeds: [rejectEmbed], components: [] });
    }

    // ─── Approve Entire Pack ────────────────────────────────────────────────
    if (action === 'approve_pack') {
      const candidates = await getEmojiCandidatesByPackId(targetId);
      const pendingInPack = candidates.filter((c) => c.review_status === 'pending_review');

      if (pendingInPack.length === 0) {
        return interaction.editReply({
          content: `ℹ️ No pending emojis found for pack \`${targetId}\`.`,
          embeds: [],
          components: [],
        });
      }

      await updateEmojiPackReviewStatus(targetId, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      // Upload all approved candidates in this pack
      const uploadResult = await uploadApprovedEmojis(interaction.guild, pendingInPack);

      const resultEmbed = new EmbedBuilder()
        .setColor(uploadResult.failed.length > 0 ? COLORS.HCC_AMBER : COLORS.HCC_GREEN)
        .setTitle(`📦 Emoji Pack Processed: ${targetId}`)
        .setDescription(
          `**Pack Approval Summary** by <@${interaction.user.id}>:\n` +
          `• **Uploaded:** ${uploadResult.uploaded.length} emoji(s)\n` +
          `• **Failed:** ${uploadResult.failed.length}\n` +
          `• **Skipped (Slot Limit):** ${uploadResult.skippedSlots.length}\n` +
          `• **Remaining Server Slots:** ${uploadResult.remainingSlots}`
        )
        .setTimestamp();

      if (uploadResult.skippedSlots.length > 0) {
        const skippedNames = uploadResult.skippedSlots.map((s) => `:${s.candidate.name}:`).join(', ');
        resultEmbed.addFields({ name: '⚠️ Skipped Due to Capacity (50 max)', value: skippedNames.slice(0, 1024) });
      }

      return interaction.editReply({ embeds: [resultEmbed], components: [] });
    }

    // ─── Reject Entire Pack ─────────────────────────────────────────────────
    if (action === 'reject_pack') {
      await updateEmojiPackReviewStatus(targetId, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: 'Pack rejected by administrator',
      });

      return interaction.editReply({
        content: `🗑️ **Emoji Pack Rejected**: All pending candidates in pack \`${targetId}\` have been rejected.`,
        embeds: [],
        components: [],
      });
    }

    // ─── Navigation ─────────────────────────────────────────────────────────
    if (action === 'nav') {
      const nextIndex = parseInt(targetId, 10) || 0;
      const pending = await getPendingEmojiCandidates({ limit: 50 });

      if (pending.length === 0) {
        return interaction.editReply({
          content: '🎉 **All caught up!** No pending emoji candidates to review.',
          embeds: [],
          components: [],
        });
      }

      const clampedIndex = Math.max(0, Math.min(nextIndex, pending.length - 1));
      const candidate = pending[clampedIndex];
      const slotInfo = await getGuildEmojiSlotInfo(interaction.guild);

      const payload = buildEmojiReviewPayload(candidate, {
        currentIndex: clampedIndex,
        totalCount: pending.length,
        slotInfo,
      });

      return interaction.editReply(payload);
    }
  } catch (err) {
    logger.error('Error handling emoji button interaction', {
      error: err.message,
      stack: err.stack,
    });
    return interaction.editReply({
      content: `❌ An unexpected error occurred while processing the emoji interaction: ${err.message}`,
      embeds: [],
      components: [],
    });
  }
}

