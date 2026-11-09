/**
 * src/services/stickers/reviewService.js
 * Builds interactive administrator review embeds, action rows, and handles moderation buttons.
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
  getPendingCandidates,
  getCandidateById,
  getCandidatesByPackId,
  updateCandidateReviewStatus,
  updatePackReviewStatus,
} from '../../database/queries/stickers.js';
import { uploadApprovedCandidates, getGuildStickerSlotInfo } from './uploadService.js';

/**
 * Builds the embed and button action rows for reviewing a sticker candidate.
 *
 * @param {Object} candidate
 * @param {Object} options
 * @param {number} [options.currentIndex=0]
 * @param {number} [options.totalCount=1]
 * @param {Object} [options.slotInfo]
 * @returns {{ embeds: Array<EmbedBuilder>, components: Array<ActionRowBuilder> }}
 */
export function buildCandidateReviewPayload(candidate, options = {}) {
  const { currentIndex = 0, totalCount = 1, slotInfo } = options;

  const slotSummary = slotInfo
    ? `${slotInfo.remaining} / ${slotInfo.max} slots free (${slotInfo.used} used)`
    : 'Slot check on approve';

  const embed = new EmbedBuilder()
    .setColor(COLORS.HCC_AMBER)
    .setTitle(`🎨 Sticker Review: ${candidate.name}`)
    .setDescription(
      `**Candidate ${currentIndex + 1} of ${totalCount}**\n` +
      `Review this candidate for server addition. The bot will **never** upload without explicit approval.`
    )
    .setImage(candidate.preview_url)
    .addFields(
      { name: '📦 Pack Name', value: `${candidate.pack_name} (\`${candidate.pack_id}\`)`, inline: true },
      { name: '🏷️ Category & Tag', value: `\`${candidate.category}\` | ${candidate.tags}`, inline: true },
      { name: '💾 Server Slots', value: slotSummary, inline: true },
      { name: '👤 Creator', value: candidate.creator || 'Community Artist', inline: true },
      { name: '📜 License', value: `\`${candidate.license}\``, inline: true },
      { name: '🔗 Source', value: `[View Source Asset](${candidate.source_url})`, inline: true },
      { name: '🔥 Trend / Humour Context', value: candidate.trend_reason || 'Trending college tech reaction', inline: false }
    )
    .setFooter({ text: `ID: ${candidate.id} • Verified Clean & Safe` })
    .setTimestamp();

  // Action Row 1: Candidate Actions + Navigation
  const candidateRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sticker:approve:${candidate.id}`)
      .setLabel('Approve & Upload')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`sticker:reject:${candidate.id}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  if (totalCount > 1) {
    if (currentIndex > 0) {
      candidateRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`sticker:nav:${currentIndex - 1}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('◀️')
      );
    }
    if (currentIndex < totalCount - 1) {
      candidateRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`sticker:nav:${currentIndex + 1}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('▶️')
      );
    }
  }

  // Action Row 2: Pack-level Actions
  const packRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sticker:approve_pack:${candidate.pack_id}`)
      .setLabel(`Approve Entire Pack (${candidate.pack_name})`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📦'),
    new ButtonBuilder()
      .setCustomId(`sticker:reject_pack:${candidate.pack_id}`)
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
 * Handles all button interactions starting with `sticker:`.
 * Strictly checks administrator authorization before taking action.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 */
export async function handleStickerButtonInteraction(interaction) {
  // 1. Strict Security Check
  if (!isStickerAdmin(interaction)) {
    logger.warn('Unauthorized user attempted sticker moderation button', {
      user: interaction.user.tag,
      userId: interaction.user.id,
      customId: interaction.customId,
    });
    return interaction.reply({
      content: '⛔ **Access Denied**: You do not have permission to approve or reject stickers. This action is restricted to HCC administrators.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferUpdate();

  const parts = interaction.customId.split(':');
  const action = parts[1];
  const targetId = parts[2];

  try {
    // ─── Approve Single Sticker ──────────────────────────────────────────────
    if (action === 'approve') {
      const candidate = await getCandidateById(targetId);
      if (!candidate) {
        return interaction.editReply({
          content: `⚠️ Candidate \`${targetId}\` not found in database.`,
          embeds: [],
          components: [],
        });
      }

      await updateCandidateReviewStatus(candidate.id, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      // Upload to Discord
      const uploadResult = await uploadApprovedCandidates(interaction.guild, [candidate]);

      if (uploadResult.uploaded.length > 0) {
        const item = uploadResult.uploaded[0];
        const successEmbed = new EmbedBuilder()
          .setColor(COLORS.HCC_GREEN)
          .setTitle('✅ Sticker Approved & Uploaded!')
          .setDescription(`**${candidate.name}** has been added to the HCC Discord server!`)
          .setThumbnail(candidate.preview_url)
          .addFields(
            { name: 'Sticker ID', value: `\`${item.sticker.id}\``, inline: true },
            { name: 'Tags', value: candidate.tags, inline: true },
            { name: 'Approved By', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Remaining Slots', value: `${uploadResult.remainingSlots} free`, inline: true }
          )
          .setTimestamp();

        return interaction.editReply({ embeds: [successEmbed], components: [] });
      }

      if (uploadResult.skippedSlots.length > 0) {
        return interaction.editReply({
          content: `⚠️ **Upload Skipped**: No sticker slots remaining on this server! The sticker was marked as approved in DB but could not be uploaded.`,
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

    // ─── Reject Single Sticker ──────────────────────────────────────────────
    if (action === 'reject') {
      const candidate = await getCandidateById(targetId);
      if (!candidate) {
        return interaction.editReply({
          content: `⚠️ Candidate \`${targetId}\` not found.`,
          embeds: [],
          components: [],
        });
      }

      await updateCandidateReviewStatus(candidate.id, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: 'Rejected during manual administrator review',
      });

      const rejectEmbed = new EmbedBuilder()
        .setColor(COLORS.HCC_RED)
        .setTitle('❌ Sticker Rejected')
        .setDescription(`Candidate **${candidate.name}** was rejected by <@${interaction.user.id}>. It will not be uploaded.`)
        .setThumbnail(candidate.preview_url)
        .setTimestamp();

      return interaction.editReply({ embeds: [rejectEmbed], components: [] });
    }

    // ─── Approve Entire Pack ────────────────────────────────────────────────
    if (action === 'approve_pack') {
      const candidates = await getCandidatesByPackId(targetId);
      const pendingInPack = candidates.filter((c) => c.review_status === 'pending_review');

      if (pendingInPack.length === 0) {
        return interaction.editReply({
          content: `ℹ️ No pending stickers found for pack \`${targetId}\`.`,
          embeds: [],
          components: [],
        });
      }

      await updatePackReviewStatus(targetId, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      // Upload all approved candidates in this pack
      const uploadResult = await uploadApprovedCandidates(interaction.guild, pendingInPack);

      const resultEmbed = new EmbedBuilder()
        .setColor(uploadResult.failed.length > 0 ? COLORS.HCC_AMBER : COLORS.HCC_GREEN)
        .setTitle(`📦 Pack Processed: ${targetId}`)
        .setDescription(
          `**Pack Approval Summary** by <@${interaction.user.id}>:\n` +
          `• **Uploaded:** ${uploadResult.uploaded.length} sticker(s)\n` +
          `• **Failed:** ${uploadResult.failed.length}\n` +
          `• **Skipped (Slot Limit):** ${uploadResult.skippedSlots.length}\n` +
          `• **Remaining Server Slots:** ${uploadResult.remainingSlots}`
        )
        .setTimestamp();

      if (uploadResult.skippedSlots.length > 0) {
        const skippedNames = uploadResult.skippedSlots.map((s) => s.candidate.name).join(', ');
        resultEmbed.addFields({ name: '⚠️ Skipped Due to Capacity', value: skippedNames });
      }

      return interaction.editReply({ embeds: [resultEmbed], components: [] });
    }

    // ─── Reject Entire Pack ─────────────────────────────────────────────────
    if (action === 'reject_pack') {
      await updatePackReviewStatus(targetId, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: 'Pack rejected by administrator',
      });

      return interaction.editReply({
        content: `🗑️ **Pack Rejected**: All pending candidates in pack \`${targetId}\` have been rejected.`,
        embeds: [],
        components: [],
      });
    }

    // ─── Navigation ─────────────────────────────────────────────────────────
    if (action === 'nav') {
      const nextIndex = parseInt(targetId, 10) || 0;
      const pending = await getPendingCandidates({ limit: 50 });

      if (pending.length === 0) {
        return interaction.editReply({
          content: '🎉 **All caught up!** No pending sticker candidates to review.',
          embeds: [],
          components: [],
        });
      }

      const clampedIndex = Math.max(0, Math.min(nextIndex, pending.length - 1));
      const candidate = pending[clampedIndex];
      const slotInfo = await getGuildStickerSlotInfo(interaction.guild);

      const payload = buildCandidateReviewPayload(candidate, {
        currentIndex: clampedIndex,
        totalCount: pending.length,
        slotInfo,
      });

      return interaction.editReply(payload);
    }
  } catch (err) {
    logger.error('Error handling sticker button interaction', {
      error: err.message,
      stack: err.stack,
    });
    return interaction.editReply({
      content: `❌ An unexpected error occurred while processing the sticker interaction: ${err.message}`,
      embeds: [],
      components: [],
    });
  }
}

