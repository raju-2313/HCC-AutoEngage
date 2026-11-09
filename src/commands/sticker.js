/**
 * src/commands/sticker.js
 * Comprehensive HCC Sticker Discovery, Moderation, and Upload Suite.
 *
 * Subcommands:
 *   /sticker discover  - Scans for new trending Gen Z sticker candidates
 *   /sticker review    - Interactive administrator review queue
 *   /sticker approve   - Approves candidates or packs and uploads to Discord
 *   /sticker reject    - Rejects candidates or packs with reason
 *   /sticker list      - Displays active HCC server stickers
 *   /sticker slots     - Displays guild sticker slot usage and capacity
 *   /sticker scan      - Re-runs verification checks on pending candidates
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { isStickerAdmin } from '../utils/permissions.js';
import { COLORS, errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { discoveryService } from '../services/stickers/discoveryService.js';
import {
  getGuildStickerSlotInfo,
  uploadApprovedCandidates,
} from '../services/stickers/uploadService.js';
import {
  buildCandidateReviewPayload,
} from '../services/stickers/reviewService.js';
import {
  getPendingCandidates,
  getCandidateById,
  getCandidatesByPackId,
  updateCandidateReviewStatus,
  updatePackReviewStatus,
  updateVerificationStatus,
  getStickerStats,
} from '../database/queries/stickers.js';
import { verifyCandidate } from '../services/stickers/verificationService.js';

export const data = new SlashCommandBuilder()
  .setName('sticker')
  .setDescription('HCC Sticker Discovery & Management System.')
  // ── /sticker discover ──
  .addSubcommand((sub) =>
    sub
      .setName('discover')
      .setDescription('Starts a new sticker discovery scan across verified sources.')
      .addIntegerOption((opt) =>
        opt
          .setName('limit')
          .setDescription('Number of candidates to scan (1-25). Default: 10')
          .setMinValue(1)
          .setMaxValue(25)
      )
      .addStringOption((opt) =>
        opt
          .setName('category')
          .setDescription('Filter candidates by category')
          .addChoices(
            { name: 'Coding Memes', value: 'coding_memes' },
            { name: 'Student Life', value: 'student_life' },
            { name: 'College Reactions', value: 'college_reactions' },
            { name: 'Tech Culture', value: 'tech_culture' }
          )
      )
  )
  // ── /sticker review ──
  .addSubcommand((sub) =>
    sub
      .setName('review')
      .setDescription('Displays pending sticker candidates for administrator review.')
  )
  // ── /sticker approve ──
  .addSubcommand((sub) =>
    sub
      .setName('approve')
      .setDescription('Approves selected candidates or packs and uploads them.')
      .addStringOption((opt) =>
        opt
          .setName('id')
          .setDescription('UUID of a specific sticker candidate to approve')
      )
      .addStringOption((opt) =>
        opt
          .setName('pack')
          .setDescription('Pack ID to approve all pending candidates within')
      )
  )
  // ── /sticker reject ──
  .addSubcommand((sub) =>
    sub
      .setName('reject')
      .setDescription('Rejects selected sticker candidates or packs.')
      .addStringOption((opt) =>
        opt
          .setName('id')
          .setDescription('UUID of a specific sticker candidate to reject')
      )
      .addStringOption((opt) =>
        opt
          .setName('pack')
          .setDescription('Pack ID to reject all pending candidates within')
      )
      .addStringOption((opt) =>
        opt
          .setName('reason')
          .setDescription('Reason for rejection')
      )
  )
  // ── /sticker list ──
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Displays current HCC server stickers.')
  )
  // ── /sticker slots ──
  .addSubcommand((sub) =>
    sub
      .setName('slots')
      .setDescription('Displays total sticker capacity, used slots, and remaining slots.')
  )
  // ── /sticker scan ──
  .addSubcommand((sub) =>
    sub
      .setName('scan')
      .setDescription('Re-runs content, safety, and licensing checks on pending candidates.')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // ── Publicly accessible subcommands ──────────────────────────────────────────
  if (subcommand === 'slots') {
    return handleSlots(interaction);
  }
  if (subcommand === 'list') {
    return handleList(interaction);
  }

  // ── Administrator-restricted subcommands ─────────────────────────────────────
  if (!isStickerAdmin(interaction)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Access Denied',
          'You are not authorized to use sticker administration commands.\n' +
          'Only authorized administrators listed in `ADMIN_USER_IDS` or with guild management permissions can run this.'
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  switch (subcommand) {
    case 'discover':
      return handleDiscover(interaction);
    case 'review':
      return handleReview(interaction);
    case 'approve':
      return handleApprove(interaction);
    case 'reject':
      return handleReject(interaction);
    case 'scan':
      return handleScan(interaction);
    default:
      return interaction.reply({
        embeds: [errorEmbed('Unknown Action', `Subcommand \`${subcommand}\` not recognized.`)],
        flags: MessageFlags.Ephemeral,
      });
  }
}

/**
 * /sticker slots
 */
async function handleSlots(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;

  if (!guild) {
    return interaction.editReply({
      embeds: [errorEmbed('Guild Only', 'This command can only be used within an HCC server.')],
    });
  }

  const slotInfo = await getGuildStickerSlotInfo(guild);
  const stats = await getStickerStats();

  const embed = new EmbedBuilder()
    .setColor(COLORS.HCC_BLUE)
    .setTitle(`📊 Server Sticker Capacity: ${guild.name}`)
    .setDescription(
      `Discord sticker allocation is determined by server boost level (Tier ${guild.premiumTier || 0}).`
    )
    .addFields(
      { name: 'Total Capacity', value: `${slotInfo.max} slots`, inline: true },
      { name: 'Used Slots', value: `${slotInfo.used} stickers`, inline: true },
      { name: 'Available Slots', value: `${slotInfo.remaining} slots`, inline: true },
      { name: 'Pending Review', value: `${stats.pending} stickers`, inline: true },
      { name: 'Approved & Uploaded', value: `${stats.uploaded} stickers`, inline: true },
      { name: 'Rejected Candidates', value: `${stats.rejected} stickers`, inline: true }
    )
    .setFooter({ text: 'HCC AutoEngage • Sticker Management' })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

/**
 * /sticker list
 */
async function handleList(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;

  if (!guild) {
    return interaction.editReply({
      embeds: [errorEmbed('Guild Only', 'This command can only be used within an HCC server.')],
    });
  }

  try {
    const stickers = await guild.stickers.fetch();

    if (stickers.size === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.HCC_AMBER)
            .setTitle(`🏷️ HCC Server Stickers (0/${getGuildStickerSlotInfo(guild).max || 5})`)
            .setDescription('No custom stickers have been uploaded to this server yet. Run `/sticker discover` and `/sticker review` to add some!'),
        ],
      });
    }

    const lines = stickers.map((s) => `• **${s.name}** \`${s.tags}\` — ID: \`${s.id}\``);

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle(`🏷️ Current Server Stickers (${stickers.size})`)
      .setDescription(lines.join('\n').slice(0, 4000))
      .setFooter({ text: `${stickers.size} stickers installed` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Failed to list guild stickers', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Failed to Fetch Stickers', err.message)],
    });
  }
}

/**
 * /sticker discover
 */
async function handleDiscover(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const limit = interaction.options.getInteger('limit') || 10;
  const category = interaction.options.getString('category') || undefined;

  try {
    const result = await discoveryService.runDiscoveryScan({ limit, category });

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle('🔎 Sticker Discovery Scan Complete')
      .setDescription(
        `Scanned publicly available verified repositories for clean Gen Z college & developer stickers.\n` +
        `**${result.inserted}** new candidates added to the pending review queue.`
      )
      .addFields(
        { name: 'Scanned', value: `${result.scanned}`, inline: true },
        { name: 'Verified Safe', value: `${result.verified}`, inline: true },
        { name: 'Flagged / Filtered', value: `${result.flagged}`, inline: true },
        { name: 'New In Review', value: `${result.inserted}`, inline: true },
        { name: 'Duplicates Skipped', value: `${result.skipped}`, inline: true }
      )
      .setFooter({ text: 'Run /sticker review to inspect and approve candidates.' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Error in /sticker discover command', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Discovery Error', err.message)],
    });
  }
}

/**
 * /sticker review
 */
async function handleReview(interaction) {
  await interaction.deferReply();

  try {
    const pending = await getPendingCandidates({ limit: 50 });

    if (pending.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.HCC_GREEN)
            .setTitle('✨ Sticker Review Queue Empty')
            .setDescription('There are currently no stickers pending administrator review.\nRun `/sticker discover` to scan for new candidates!'),
        ],
      });
    }

    const slotInfo = await getGuildStickerSlotInfo(interaction.guild);
    const firstCandidate = pending[0];

    const payload = buildCandidateReviewPayload(firstCandidate, {
      currentIndex: 0,
      totalCount: pending.length,
      slotInfo,
    });

    return interaction.editReply(payload);
  } catch (err) {
    logger.error('Error opening sticker review queue', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Review Queue Error', err.message)],
    });
  }
}

/**
 * /sticker approve
 */
async function handleApprove(interaction) {
  await interaction.deferReply();

  const id = interaction.options.getString('id');
  const pack = interaction.options.getString('pack');

  if (!id && !pack) {
    return interaction.editReply({
      embeds: [
        errorEmbed(
          'Missing Argument',
          'Please specify either a sticker candidate `id` or a `pack` ID to approve.\nOr use `/sticker review` to review candidates interactively.'
        ),
      ],
    });
  }

  try {
    if (id) {
      const candidate = await getCandidateById(id);
      if (!candidate) {
        return interaction.editReply({
          embeds: [errorEmbed('Not Found', `Candidate with ID \`${id}\` was not found.`)],
        });
      }

      await updateCandidateReviewStatus(candidate.id, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      const uploadResult = await uploadApprovedCandidates(interaction.guild, [candidate]);

      if (uploadResult.uploaded.length > 0) {
        return interaction.editReply({
          embeds: [
            successEmbed(
              'Sticker Approved & Uploaded',
              `**${candidate.name}** has been successfully added to the server!\nSticker ID: \`${uploadResult.uploaded[0].sticker.id}\``
            ),
          ],
        });
      }

      if (uploadResult.skippedSlots.length > 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Insufficient Slots',
              `Candidate was approved in the database, but could not be uploaded because the server has 0 available sticker slots.`
            ),
          ],
        });
      }

      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Upload Error',
            uploadResult.failed[0]?.reason || 'Unknown upload failure.'
          ),
        ],
      });
    }

    if (pack) {
      const candidates = await getCandidatesByPackId(pack);
      const pendingInPack = candidates.filter((c) => c.review_status === 'pending_review');

      if (pendingInPack.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('No Pending Stickers', `Pack \`${pack}\` has no pending stickers to approve.`)],
        });
      }

      await updatePackReviewStatus(pack, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      const uploadResult = await uploadApprovedCandidates(interaction.guild, pendingInPack);

      const embed = new EmbedBuilder()
        .setColor(uploadResult.failed.length > 0 ? COLORS.HCC_AMBER : COLORS.HCC_GREEN)
        .setTitle(`📦 Pack Approved: ${pack}`)
        .setDescription(
          `• **Uploaded:** ${uploadResult.uploaded.length} sticker(s)\n` +
          `• **Failed:** ${uploadResult.failed.length}\n` +
          `• **Skipped (Slot Limit):** ${uploadResult.skippedSlots.length}\n` +
          `• **Remaining Server Slots:** ${uploadResult.remainingSlots}`
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    logger.error('Error approving sticker(s)', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Approval Error', err.message)],
    });
  }
}

/**
 * /sticker reject
 */
async function handleReject(interaction) {
  await interaction.deferReply();

  const id = interaction.options.getString('id');
  const pack = interaction.options.getString('pack');
  const reason = interaction.options.getString('reason') || 'Rejected by administrator';

  if (!id && !pack) {
    return interaction.editReply({
      embeds: [
        errorEmbed(
          'Missing Argument',
          'Please specify either a sticker candidate `id` or a `pack` ID to reject.'
        ),
      ],
    });
  }

  try {
    if (id) {
      const candidate = await getCandidateById(id);
      if (!candidate) {
        return interaction.editReply({
          embeds: [errorEmbed('Not Found', `Candidate with ID \`${id}\` was not found.`)],
        });
      }

      await updateCandidateReviewStatus(candidate.id, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: reason,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Sticker Rejected',
            `Candidate **${candidate.name}** was rejected.\nReason: *${reason}*`
          ),
        ],
      });
    }

    if (pack) {
      await updatePackReviewStatus(pack, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: reason,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Pack Rejected',
            `All pending candidates in pack \`${pack}\` were rejected.\nReason: *${reason}*`
          ),
        ],
      });
    }
  } catch (err) {
    logger.error('Error rejecting sticker(s)', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Rejection Error', err.message)],
    });
  }
}

/**
 * /sticker scan
 */
async function handleScan(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const pending = await getPendingCandidates({ limit: 100 });

    if (pending.length === 0) {
      return interaction.editReply({
        embeds: [successEmbed('Scan Complete', 'No pending candidates to rescan.')],
      });
    }

    let rescanned = 0;
    let newlyFlagged = 0;

    for (const candidate of pending) {
      const check = verifyCandidate(candidate);
      rescanned++;

      if (!check.valid) {
        newlyFlagged++;
        await updateVerificationStatus(candidate.id, {
          contentStatus: check.contentStatus,
          rejectionReason: check.reason,
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle('🛡️ Content & Licensing Rescan Complete')
      .setDescription(
        `Re-evaluated **${rescanned}** pending candidates against safety, profanity, and redistribution guidelines.`
      )
      .addFields(
        { name: 'Candidates Scanned', value: `${rescanned}`, inline: true },
        { name: 'Newly Flagged / Rejected', value: `${newlyFlagged}`, inline: true },
        { name: 'Still Pending Review', value: `${rescanned - newlyFlagged}`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Error rescanning pending candidates', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Rescan Error', err.message)],
    });
  }
}

