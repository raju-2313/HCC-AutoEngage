/**
 * src/services/emojis/uploadService.js
 * Handles Discord custom emoji capacity calculation, deduplication, and safe uploads.
 */

import { logger } from '../../utils/logger.js';
import {
  updateEmojiCandidateUploadStatus,
  getApprovedUnuploadedEmojis,
} from '../../database/queries/emojis.js';

// Discord Server Boost Tier Emoji Limits
const EMOJI_TIER_LIMITS = {
  0: 50,  // Tier 0 (Free Server) gives 50 static + 50 animated emojis!
  1: 100, // Tier 1
  2: 150, // Tier 2
  3: 250, // Tier 3
};

/**
 * Returns the maximum emoji capacity per type for a guild based on its boost tier.
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getGuildMaxEmojiSlots(guild) {
  if (!guild) return 50;
  const tier = typeof guild.premiumTier === 'number' ? guild.premiumTier : 0;
  return EMOJI_TIER_LIMITS[tier] || 50;
}

/**
 * Calculates current emoji usage and available slots for a guild.
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{
 *   max: number,
 *   usedStatic: number,
 *   usedAnimated: number,
 *   remainingStatic: number,
 *   remainingAnimated: number,
 *   existingNames: Set<string>
 * }>}
 */
export async function getGuildEmojiSlotInfo(guild) {
  const max = getGuildMaxEmojiSlots(guild);

  try {
    const emojis = await guild.emojis.fetch();
    const emojiList = typeof emojis.map === 'function' ? emojis : Array.from(emojis.values ? emojis.values() : emojis);

    let usedStatic = 0;
    let usedAnimated = 0;
    const existingNames = new Set();

    for (const emoji of emojiList) {
      if (emoji.name) existingNames.add(emoji.name.toLowerCase().trim());
      if (emoji.animated) {
        usedAnimated++;
      } else {
        usedStatic++;
      }
    }

    const remainingStatic = Math.max(0, max - usedStatic);
    const remainingAnimated = Math.max(0, max - usedAnimated);

    return {
      max,
      usedStatic,
      usedAnimated,
      remainingStatic,
      remainingAnimated,
      existingNames,
      emojis,
    };
  } catch (err) {
    logger.error('Failed to fetch guild emojis for slot calculation', { error: err.message });
    return {
      max,
      usedStatic: 0,
      usedAnimated: 0,
      remainingStatic: max,
      remainingAnimated: max,
      existingNames: new Set(),
      emojis: new Map(),
    };
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
 * Uploads a single emoji candidate to Discord.
 *
 * @param {import('discord.js').Guild} guild
 * @param {Object} candidate
 * @param {Set<string>} existingNames
 * @returns {Promise<{ success: boolean, emoji?: Object, reason?: string }>}
 */
export async function uploadSingleEmoji(guild, candidate, existingNames) {
  const cleanName = (candidate.name || '').trim().toLowerCase();

  // 1. Check for duplicates
  if (existingNames && existingNames.has(cleanName)) {
    logger.warn('Skipping upload: emoji with identical name already exists in guild', { name: cleanName });
    await updateEmojiCandidateUploadStatus(candidate.id, {
      uploadStatus: 'skipped_slots',
      uploadError: 'Emoji with identical name already exists in server.',
    });
    return { success: false, reason: `Emoji ":${cleanName}:" already exists on the server.` };
  }

  // 2. Fetch buffer
  let fileBuffer;
  try {
    fileBuffer = await fetchImageBuffer(candidate.asset_url);
  } catch (err) {
    const errorMsg = `Failed to download emoji asset: ${err.message}`;
    logger.error(errorMsg, { candidateId: candidate.id, url: candidate.asset_url });
    await updateEmojiCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });
    return { success: false, reason: errorMsg };
  }

  // 3. Verify buffer size <= 256 KB
  if (fileBuffer.length > 256 * 1024) {
    const errorMsg = `Asset size (${Math.round(fileBuffer.length / 1024)} KB) exceeds Discord emoji 256 KB limit.`;
    logger.error(errorMsg, { candidateId: candidate.id });
    await updateEmojiCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });
    return { success: false, reason: errorMsg };
  }

  // 4. Upload to Discord using guild.emojis.create
  await updateEmojiCandidateUploadStatus(candidate.id, { uploadStatus: 'uploading' });

  try {
    const created = await guild.emojis.create({
      attachment: fileBuffer,
      name: cleanName,
    });

    logger.info('Emoji uploaded to Discord successfully', {
      name: cleanName,
      emojiId: created.id,
      guildId: guild.id,
    });

    await updateEmojiCandidateUploadStatus(candidate.id, {
      uploadStatus: 'uploaded',
      discordEmojiId: created.id,
    });

    if (existingNames) {
      existingNames.add(cleanName);
    }

    return { success: true, emoji: created };
  } catch (err) {
    const errorMsg = `Discord API emoji upload error: ${err.message}`;
    logger.error(errorMsg, { candidateId: candidate.id, error: err.message });

    await updateEmojiCandidateUploadStatus(candidate.id, {
      uploadStatus: 'failed',
      uploadError: errorMsg,
    });

    return { success: false, reason: errorMsg };
  }
}

/**
 * Batch uploads approved emojis enforcing slot capacity.
 *
 * @param {import('discord.js').Guild} guild
 * @param {Array<Object>} [candidates]
 * @returns {Promise<{
 *   attempted: number,
 *   uploaded: Array<Object>,
 *   failed: Array<Object>,
 *   skippedSlots: Array<Object>,
 *   remainingSlots: number
 * }>}
 */
export async function uploadApprovedEmojis(guild, candidates = null) {
  const slotInfo = await getGuildEmojiSlotInfo(guild);
  let availableSlots = slotInfo.remainingStatic;
  const existingNames = slotInfo.existingNames;

  const toUpload = candidates || (await getApprovedUnuploadedEmojis(50));

  const uploaded = [];
  const failed = [];
  const skippedSlots = [];

  logger.info('Processing approved emoji uploads', {
    candidatesCount: toUpload.length,
    availableSlots,
    guildName: guild.name,
  });

  for (const candidate of toUpload) {
    if (availableSlots <= 0) {
      logger.warn('Guild emoji slots exhausted. Skipping remaining approved candidates.', {
        candidateName: candidate.name,
      });
      await updateEmojiCandidateUploadStatus(candidate.id, {
        uploadStatus: 'skipped_slots',
        uploadError: 'Insufficient static emoji slots available on Discord server.',
      });
      skippedSlots.push({ candidate, reason: 'No available static emoji slots remaining on server (50 slot limit reached)' });
      continue;
    }

    const result = await uploadSingleEmoji(guild, candidate, existingNames);
    if (result.success) {
      uploaded.push({ candidate, emoji: result.emoji });
      availableSlots--;
    } else {
      failed.push({ candidate, reason: result.reason });
    }

    // Small delay between uploads to avoid Discord rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    attempted: toUpload.length,
    uploaded,
    failed,
    skippedSlots,
    remainingSlots: availableSlots,
  };
}

