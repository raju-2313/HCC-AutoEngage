/**
 * src/services/stickers/uploadService.js
 * Handles Discord sticker capacity calculation, deduplication, and safe uploads.
 */

import { logger } from '../../utils/logger.js';
import {
  updateCandidateUploadStatus,
  getApprovedUnuploadedCandidates,
  getCandidateById,
} from '../../database/queries/stickers.js';

// Discord Server Boost Tier Sticker Limits
const STICKER_TIER_LIMITS = {
  0: 5,  // Tier 0 / None
  1: 15, // Tier 1
  2: 30, // Tier 2
  3: 60, // Tier 3
};

/**
 * Returns the maximum sticker capacity for a guild based on its boost tier.
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getGuildMaxStickerSlots(guild) {
  if (!guild) return 5;
  const tier = typeof guild.premiumTier === 'number' ? guild.premiumTier : 0;
  return STICKER_TIER_LIMITS[tier] || 5;
}

/**
 * Calculates current sticker usage and available slots for a guild.
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{ max: number, used: number, remaining: number, existingNames: Set<string> }>}
 */
export async function getGuildStickerSlotInfo(guild) {
  const max = getGuildMaxStickerSlots(guild);

  try {
    const stickers = await guild.stickers.fetch();
    const used = typeof stickers.size === 'number' ? stickers.size : (stickers.length || 0);
    const remaining = Math.max(0, max - used);
    const stickerList = typeof stickers.map === 'function' ? stickers : Array.from(stickers.values ? stickers.values() : stickers);
    const existingNames = new Set(stickerList.map((s) => s.name.toLowerCase().trim()));

    return { max, used, remaining, existingNames, stickers };
  } catch (err) {
    logger.error('Failed to fetch guild stickers for slot calculation', { error: err.message });
    return { max, used: 0, remaining: max, existingNames: new Set(), stickers: new Map() };
  }
}

/**
 * Fetches an image buffer from a remote URL with timeout.
 * @param {string} url
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<Buffer>}
 */
async function fetchImageBuffer(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Uploads a single candidate to Discord.
 *
 * @param {import('discord.js').Guild} guild
 * @param {Object} candidate
 * @param {Set<string>} existingNames
 * @returns {Promise<{ success: boolean, sticker?: Object, reason?: string }>}
 */
export async function uploadSingleCandidate(guild, candidate, existingNames) {
  const cleanName = (candidate.name || '').trim();
  const normalizedName = cleanName.toLowerCase();

  // 1. Check for duplicates against existing guild stickers
  if (existingNames && existingNames.has(normalizedName)) {
    logger.warn('Skipping upload: sticker with identical name already exists in guild', { name: cleanName });
    await updateCandidateUploadStatus(candidate.id, {
      uploadStatus: 'skipped_slots',
      uploadError: 'Sticker with identical name already exists in server.',
    });
    return { success: false, reason: `Sticker "${cleanName}" already exists on the server.` };
  }

  // 2. Fetch image buffer
  let fileBuffer;
  try {
    fileBuffer = await fetchImageBuffer(candidate.asset_url);
  } catch (err) {
    const errorMsg = `Failed to download sticker asset: ${err.message}`;
    logger.error(errorMsg, { candidateId: candidate.id, url: candidate.asset_url });
    await updateCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });
    return { success: false, reason: errorMsg };
  }

  // 3. Verify buffer size <= 512 KB
  if (fileBuffer.length > 512 * 1024) {
    const errorMsg = `Asset size (${Math.round(fileBuffer.length / 1024)} KB) exceeds Discord 512 KB limit.`;
    logger.error(errorMsg, { candidateId: candidate.id });
    await updateCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });
    return { success: false, reason: errorMsg };
  }

  // 4. Upload to Discord using Discord.js GuildStickerManager
  await updateCandidateUploadStatus(candidate.id, { uploadStatus: 'uploading' });

  try {
    const tagEmoji = candidate.tags || '🏷️';
    const description = (candidate.description || candidate.trend_reason || '').slice(0, 100);

    const created = await guild.stickers.create({
      file: fileBuffer,
      name: cleanName.slice(0, 30),
      tags: tagEmoji,
      description,
    });

    logger.info('Sticker uploaded to Discord successfully', {
      name: cleanName,
      stickerId: created.id,
      guildId: guild.id,
    });

    await updateCandidateUploadStatus(candidate.id, {
      uploadStatus: 'uploaded',
      discordStickerId: created.id,
    });

    if (existingNames) {
      existingNames.add(normalizedName);
    }

    return { success: true, sticker: created };
  } catch (err) {
    const errorMsg = `Discord API upload error: ${err.message}`;
    logger.error(errorMsg, { candidateId: candidate.id, error: err.message });

    await updateCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });

    return { success: false, reason: errorMsg };
  }
}

/**
 * Batch uploads approved candidates while strictly enforcing available slots.
 *
 * @param {import('discord.js').Guild} guild
 * @param {Array<Object>} [candidates] - Optional specific candidates to upload; otherwise fetches approved from DB.
 * @returns {Promise<{
 *   attempted: number,
 *   uploaded: Array<Object>,
 *   failed: Array<Object>,
 *   skippedSlots: Array<Object>,
 *   remainingSlots: number
 * }>}
 */
export async function uploadApprovedCandidates(guild, candidates = null) {
  const slotInfo = await getGuildStickerSlotInfo(guild);
  let availableSlots = slotInfo.remaining;
  const existingNames = slotInfo.existingNames;

  const toUpload = candidates || (await getApprovedUnuploadedCandidates(50));

  const uploaded = [];
  const failed = [];
  const skippedSlots = [];

  logger.info('Processing approved sticker uploads', {
    candidatesCount: toUpload.length,
    availableSlots,
    guildName: guild.name,
  });

  for (const candidate of toUpload) {
    if (availableSlots <= 0) {
      logger.warn('Guild sticker slots exhausted. Skipping remaining approved candidates.', {
        candidateName: candidate.name,
      });
      await updateCandidateUploadStatus(candidate.id, {
        uploadStatus: 'skipped_slots',
        uploadError: 'Insufficient sticker slots available on Discord server.',
      });
      skippedSlots.push({ candidate, reason: 'No available sticker slots remaining on server' });
      continue;
    }

    const result = await uploadSingleCandidate(guild, candidate, existingNames);
    if (result.success) {
      uploaded.push({ candidate, sticker: result.sticker });
      availableSlots--;
    } else {
      failed.push({ candidate, reason: result.reason });
    }

    // Small delay between uploads to prevent burst rate-limits
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return {
    attempted: toUpload.length,
    uploaded,
    failed,
    skippedSlots,
    remainingSlots: availableSlots,
  };
}
