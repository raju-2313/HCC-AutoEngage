/**
 * src/services/emojis/verificationService.js
 * Multi-layer content moderation, licensing verification, and Discord emoji constraint checks.
 */

import { logger } from '../../utils/logger.js';
import { checkTextModeration, checkLicenseValidity } from '../stickers/verificationService.js';

// Discord Emoji Constraints
const MAX_DISCORD_EMOJI_SIZE_BYTES = 256 * 1024; // 256 KB
const ALLOWED_EMOJI_FORMATS = new Set(['png', 'gif', 'jpg', 'jpeg', 'webp']);
const DISCORD_EMOJI_NAME_REGEX = /^[a-zA-Z0-9_]{2,32}$/;

/**
 * Sanitizes any raw string into a compliant Discord emoji name.
 * e.g. "Dev Typing Fast!" -> "dev_typing_fast"
 *
 * @param {string} rawName
 * @returns {string}
 */
export function sanitizeDiscordEmojiName(rawName) {
  if (!rawName) return 'emoji';
  const sanitized = rawName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  return sanitized.length < 2 ? `${sanitized}_e` : sanitized;
}

/**
 * Validates technical Discord emoji requirements.
 *
 * @param {Object} candidate
 * @returns {{ valid: boolean, reason?: string }}
 */
export function checkDiscordEmojiCompatibility(candidate) {
  const name = (candidate.name || '').trim();

  if (!DISCORD_EMOJI_NAME_REGEX.test(name)) {
    return {
      valid: false,
      reason: `Emoji name "${name}" is invalid. Discord requires 2-32 alphanumeric characters and underscores only (no spaces).`,
    };
  }

  const desc = candidate.description || '';
  if (desc.length > 100) {
    return {
      valid: false,
      reason: `Description length (${desc.length}) exceeds 100 characters limit.`,
    };
  }

  const format = (candidate.asset_format || 'png').toLowerCase().trim();
  if (!ALLOWED_EMOJI_FORMATS.has(format)) {
    return {
      valid: false,
      reason: `Asset format "${format}" is unsupported for Discord emojis. Must be PNG, GIF, JPEG, or WEBP.`,
    };
  }

  if (candidate.file_size_bytes && candidate.file_size_bytes > MAX_DISCORD_EMOJI_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Asset file size (${Math.round(candidate.file_size_bytes / 1024)} KB) exceeds Discord 256 KB limit.`,
    };
  }

  if (!candidate.asset_url || !candidate.asset_url.startsWith('http')) {
    return {
      valid: false,
      reason: 'Invalid or missing emoji asset URL.',
    };
  }

  return { valid: true };
}

/**
 * Runs the verification pipeline on an emoji candidate.
 *
 * @param {Object} candidate
 * @returns {{
 *   valid: boolean,
 *   contentStatus: 'verified'|'flagged_profanity'|'flagged_license'|'flagged_quality',
 *   reason?: string
 * }}
 */
export function verifyEmojiCandidate(candidate) {
  // 1. Check text moderation
  const combinedText = `${candidate.name || ''} ${candidate.description || ''} ${candidate.trend_reason || ''}`;
  const textMod = checkTextModeration(combinedText);
  if (!textMod.clean) {
    logger.warn('Emoji candidate rejected: vulgarity detected', {
      candidate: candidate.name,
      pattern: textMod.matchedPattern,
    });
    return {
      valid: false,
      contentStatus: 'flagged_profanity',
      reason: 'Contains profanity, vulgarity, or inappropriate text.',
    };
  }

  // 2. Check licensing
  const licenseCheck = checkLicenseValidity(candidate.license, candidate.license_details);
  if (!licenseCheck.acceptable) {
    logger.warn('Emoji candidate rejected: license check failed', {
      candidate: candidate.name,
      license: candidate.license,
      reason: licenseCheck.reason,
    });
    return {
      valid: false,
      contentStatus: 'flagged_license',
      reason: licenseCheck.reason,
    };
  }

  // 3. Check Discord technical constraints
  const discordCheck = checkDiscordEmojiCompatibility(candidate);
  if (!discordCheck.valid) {
    logger.warn('Emoji candidate rejected: Discord compatibility check failed', {
      candidate: candidate.name,
      reason: discordCheck.reason,
    });
    return {
      valid: false,
      contentStatus: 'flagged_quality',
      reason: discordCheck.reason,
    };
  }

  return {
    valid: true,
    contentStatus: 'verified',
  };
}

