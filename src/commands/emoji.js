/**
 * src/commands/emoji.js
 * Comprehensive HCC Custom Emoji Discovery, Moderation, and Upload Suite.
 *
 * Subcommands:
 *   /emoji discover  - Scans 50 popular, non-vulgar Gen Z & Tech emojis
 *   /emoji review    - Interactive administrator review queue with buttons
 *   /emoji approve   - Approves candidates or packs and uploads to Discord
 *   /emoji reject    - Rejects candidates or packs with reason
 *   /emoji list      - Displays active HCC server custom emojis
 *   /emoji slots     - Displays guild emoji slot usage and capacity (50 static/animated)
 *   /emoji scan      - Re-runs verification checks on pending candidates
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { isStickerAdmin } from '../utils/permissions.js';
import { COLORS, errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { emojiDiscoveryService } from '../services/emojis/discoveryService.js';
import {
  getGuildEmojiSlotInfo,
  uploadApprovedEmojis,
} from '../services/emojis/uploadService.js';
import {
  buildEmojiReviewPayload,
} from '../services/emojis/reviewService.js';
import {
  getPendingEmojiCandidates,
  getEmojiCandidateById,
  getEmojiCandidatesByPackId,
  updateEmojiCandidateReviewStatus,
  updateEmojiPackReviewStatus,
  updateEmojiVerificationStatus,
  getEmojiStats,
} from '../database/queries/emojis.js';
import { verifyEmojiCandidate } from '../services/emojis/verificationService.js';

export const data = new SlashCommandBuilder()
  .setName('emoji')
  .setDescription('HCC Custom Emoji Discovery & Management System.')
  // ── /emoji discover ──
  .addSubcommand((sub) =>
    sub
      .setName('discover')
      .setDescription('Starts a discovery scan of 50 popular, non-vulgar Gen Z and tech emojis.')
      .addIntegerOption((opt) =>
        opt
          .setName('limit')
          .setDescription('Number of candidates to scan (1-50). Default: 50')
          .setMinValue(1)
          .setMaxValue(50)
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
  // ── /emoji review ──
  .addSubcommand((sub) =>
    sub
      .setName('review')
      .setDescription('Displays pending emoji candidates for administrator review.')
  )
  // ── /emoji approve ──
  .addSubcommand((sub) =>
    sub
      .setName('approve')
      .setDescription('Approves selected candidates or packs and uploads them.')
      .addStringOption((opt) =>
        opt
          .setName('id')
          .setDescription('UUID of a specific emoji candidate to approve')
      )
      .addStringOption((opt) =>
        opt
          .setName('pack')
          .setDescription('Pack ID to approve all pending candidates within')
      )
  )
  // ── /emoji reject ──
  .addSubcommand((sub) =>
    sub
      .setName('reject')
      .setDescription('Rejects selected emoji candidates or packs.')
      .addStringOption((opt) =>
        opt
          .setName('id')
          .setDescription('UUID of a specific emoji candidate to reject')
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
  // ── /emoji list ──
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Displays current HCC server custom emojis.')
  )
  // ── /emoji slots ──
  .addSubcommand((sub) =>
    sub
      .setName('slots')
      .setDescription('Displays server emoji capacity, used slots, and remaining slots.')
  )
  // ── /emoji scan ──
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
          'You are not authorized to use emoji administration commands.\n' +
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
 * /emoji slots
 */
async function handleSlots(interaction) {
  await interaction.deferReply();
  const guild = interaction.guild;

  if (!guild) {
    return interaction.editReply({
      embeds: [errorEmbed('Guild Only', 'This command can only be used within an HCC server.')],
    });
  }

  const slotInfo = await getGuildEmojiSlotInfo(guild);
  const stats = await getEmojiStats();

  const embed = new EmbedBuilder()
    .setColor(COLORS.HCC_BLUE)
    .setTitle(`📊 Server Emoji Capacity: ${guild.name}`)
    .setDescription(
      `Discord servers provide **${slotInfo.max} static** + **${slotInfo.max} animated** custom emoji slots.`
    )
    .addFields(
      { name: 'Static Capacity', value: `${slotInfo.max} slots`, inline: true },
      { name: 'Used Static', value: `${slotInfo.usedStatic} emojis`, inline: true },
      { name: 'Available Static', value: `${slotInfo.remainingStatic} slots`, inline: true },
      { name: 'Animated Capacity', value: `${slotInfo.max} slots`, inline: true },
      { name: 'Used Animated', value: `${slotInfo.usedAnimated} emojis`, inline: true },
      { name: 'Available Animated', value: `${slotInfo.remainingAnimated} slots`, inline: true },
      { name: 'Pending Review', value: `${stats.pending} emojis`, inline: true },
      { name: 'Approved & Uploaded', value: `${stats.uploaded} emojis`, inline: true },
      { name: 'Rejected Candidates', value: `${stats.rejected} emojis`, inline: true }
    )
    .setFooter({ text: 'HCC AutoEngage • Emoji Management' })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

/**
 * /emoji list
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
    const emojis = await guild.emojis.fetch();

    if (emojis.size === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.HCC_AMBER)
            .setTitle(`😀 HCC Server Emojis (0/${getGuildEmojiSlotInfo(guild).max || 50})`)
            .setDescription('No custom emojis have been uploaded to this server yet. Run `/emoji discover` and `/emoji review` to add popular community emojis!'),
        ],
      });
    }

    const lines = emojis.map((e) => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}> \`:${e.name}:\` — ID: \`${e.id}\``);

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle(`😀 Current Server Custom Emojis (${emojis.size})`)
      .setDescription(lines.slice(0, 40).join('\n').slice(0, 4000))
      .setFooter({ text: `${emojis.size} custom emojis installed` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Failed to list guild emojis', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Failed to Fetch Emojis', err.message)],
    });
  }
}

/**
 * /emoji discover
 */
async function handleDiscover(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const limit = interaction.options.getInteger('limit') || 50;
  const category = interaction.options.getString('category') || undefined;

  try {
    const result = await emojiDiscoveryService.runDiscoveryScan({ limit, category });

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle('🔎 50 Non-Vulgar Emojis Discovery Scan Complete')
      .setDescription(
        `Scanned repository for popular, clean Gen Z college & developer emojis.\n` +
        `**${result.inserted}** new candidates added to the pending review queue.`
      )
      .addFields(
        { name: 'Scanned', value: `${result.scanned}`, inline: true },
        { name: 'Verified Safe', value: `${result.verified}`, inline: true },
        { name: 'Flagged / Filtered', value: `${result.flagged}`, inline: true },
        { name: 'New In Review', value: `${result.inserted}`, inline: true },
        { name: 'Duplicates Skipped', value: `${result.skipped}`, inline: true }
      )
      .setFooter({ text: 'Run /emoji review to inspect and approve candidates.' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Error in /emoji discover command', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Discovery Error', err.message)],
    });
  }
}

/**
 * /emoji review
 */
async function handleReview(interaction) {
  await interaction.deferReply();

  try {
    const pending = await getPendingEmojiCandidates({ limit: 50 });

    if (pending.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.HCC_GREEN)
            .setTitle('✨ Emoji Review Queue Empty')
            .setDescription('There are currently no emojis pending administrator review.\nRun `/emoji discover` to load the 50 popular emojis!'),
        ],
      });
    }

    const slotInfo = await getGuildEmojiSlotInfo(interaction.guild);
    const firstCandidate = pending[0];

    const payload = buildEmojiReviewPayload(firstCandidate, {
      currentIndex: 0,
      totalCount: pending.length,
      slotInfo,
    });

    return interaction.editReply(payload);
  } catch (err) {
    logger.error('Error opening emoji review queue', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Review Queue Error', err.message)],
    });
  }
}

/**
 * /emoji approve
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
          'Please specify either an emoji candidate `id` or a `pack` ID to approve.\nOr use `/emoji review` to review candidates interactively.'
        ),
      ],
    });
  }

  try {
    if (id) {
      const candidate = await getEmojiCandidateById(id);
      if (!candidate) {
        return interaction.editReply({
          embeds: [errorEmbed('Not Found', `Candidate with ID \`${id}\` was not found.`)],
        });
      }

      await updateEmojiCandidateReviewStatus(candidate.id, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      const uploadResult = await uploadApprovedEmojis(interaction.guild, [candidate]);

      if (uploadResult.uploaded.length > 0) {
        return interaction.editReply({
          embeds: [
            successEmbed(
              'Emoji Approved & Uploaded',
              `**:${candidate.name}:** has been successfully added to the server!\nEmoji ID: \`${uploadResult.uploaded[0].emoji.id}\``
            ),
          ],
        });
      }

      if (uploadResult.skippedSlots.length > 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Insufficient Slots',
              `Candidate was approved in the database, but could not be uploaded because the server has 0 available static emoji slots.`
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
      const candidates = await getEmojiCandidatesByPackId(pack);
      const pendingInPack = candidates.filter((c) => c.review_status === 'pending_review');

      if (pendingInPack.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('No Pending Emojis', `Pack \`${pack}\` has no pending emojis to approve.`)],
        });
      }

      await updateEmojiPackReviewStatus(pack, {
        reviewStatus: 'approved',
        approvedBy: interaction.user.id,
      });

      const uploadResult = await uploadApprovedEmojis(interaction.guild, pendingInPack);

      const embed = new EmbedBuilder()
        .setColor(uploadResult.failed.length > 0 ? COLORS.HCC_AMBER : COLORS.HCC_GREEN)
        .setTitle(`📦 Emoji Pack Approved: ${pack}`)
        .setDescription(
          `• **Uploaded:** ${uploadResult.uploaded.length} emoji(s)\n` +
          `• **Failed:** ${uploadResult.failed.length}\n` +
          `• **Skipped (Slot Limit):** ${uploadResult.skippedSlots.length}\n` +
          `• **Remaining Server Slots:** ${uploadResult.remainingSlots}`
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    logger.error('Error approving emoji(s)', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Approval Error', err.message)],
    });
  }
}

/**
 * /emoji reject
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
          'Please specify either an emoji candidate `id` or a `pack` ID to reject.'
        ),
      ],
    });
  }

  try {
    if (id) {
      const candidate = await getEmojiCandidateById(id);
      if (!candidate) {
        return interaction.editReply({
          embeds: [errorEmbed('Not Found', `Candidate with ID \`${id}\` was not found.`)],
        });
      }

      await updateEmojiCandidateReviewStatus(candidate.id, {
        reviewStatus: 'rejected',
        approvedBy: interaction.user.id,
        rejectionReason: reason,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Emoji Rejected',
            `Candidate **:${candidate.name}:** was rejected.\nReason: *${reason}*`
          ),
        ],
      });
    }

    if (pack) {
      await updateEmojiPackReviewStatus(pack, {
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
    logger.error('Error rejecting emoji(s)', { error: err.message });
    return interaction.editReply({
      embeds: [errorEmbed('Rejection Error', err.message)],
    });
  }
}

/**
 * /emoji scan
 */
async function handleScan(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const pending = await getPendingEmojiCandidates({ limit: 100 });

    if (pending.length === 0) {
      return interaction.editReply({
        embeds: [successEmbed('Scan Complete', 'No pending candidates to rescan.')],
      });
    }

    let rescanned = 0;
    let newlyFlagged = 0;

    for (const candidate of pending) {
      const check = verifyEmojiCandidate(candidate);
      rescanned++;

      if (!check.valid) {
        newlyFlagged++;
        await updateEmojiVerificationStatus(candidate.id, {
          contentStatus: check.contentStatus,
          rejectionReason: check.reason,
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.HCC_GREEN)
      .setTitle('🛡️ Content & Safety Rescan Complete')
      .setDescription(
        `Re-evaluated **${rescanned}** pending emoji candidates against safety, profanity, and redistribution guidelines.`
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

