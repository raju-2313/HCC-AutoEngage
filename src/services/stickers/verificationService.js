/**
 * src/services/stickers/verificationService.js
 * Multi-layer content moderation, licensing verification, and Discord constraint checks.
 */

import { logger } from '../../utils/logger.js';

// Approved open / redistribution licenses
const ACCEPTABLE_LICENSES = new Set([
  'CC0',
  'CC0-1.0',
  'CC-BY',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA',
  'CC-BY-SA-4.0',
  'MIT',
  'APACHE-2.0',
  'PUBLIC_DOMAIN',
  'HCC-COMMUNITY-FAIRUSE',
  'OPEN_SOURCE',
]);

// Explicit words & patterns that violate community standards
// Word-boundary matching prevents false positives (e.g., 'class', 'pass', 'cockpit', etc.)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|cock|porn|nsfw|nude|sex|erotic)\b/i,
  /\b(slut|whore|nazi|hitler|faggot|retard|nigga|nigger|chink|kike)\b/i,
  /\b(kill\s*yourself|kys|commit\s*suicide|hate\s*crime|behead|gore)\b/i,
];

// Discord limits
const MAX_DISCORD_STICKER_SIZE_BYTES = 512 * 1024; // 512 KB
const ALLOWED_ASSET_FORMATS = new Set(['png', 'apng', 'gif', 'json']);

/**
 * Validates text fields for profanity, vulgarity, hate speech, and harassment.
 * @param {string} text
 * @returns {{ clean: boolean, matchedPattern?: string }}
 */
export function checkTextModeration(text) {
  if (!text) return { clean: true };

  // Replace underscores and hyphens with spaces so word boundary matching \b works for snake_case emoji names
  const normalizedText = text.replace(/[_\-]+/g, ' ');

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return { clean: false, matchedPattern: pattern.source };
    }
  }

  return { clean: true };
}

/**
 * Validates the license and redistribution permissions.
 * @param {string} license
 * @param {string} [licenseDetails]
 * @returns {{ acceptable: boolean, reason?: string }}
 */
export function checkLicenseValidity(license, licenseDetails = '') {
  if (!license) {
    return { acceptable: false, reason: 'Missing license or permission attribution.' };
  }

  const normalized = license.toUpperCase().trim().replace(/\s+/g, '-');

  // Check against accepted whitelist
  if (ACCEPTABLE_LICENSES.has(normalized)) {
    return { acceptable: true };
  }

  // Reject known proprietary or restrictive markers
  const textToCheck = `${normalized} ${licenseDetails}`.toLowerCase();
  if (
    textToCheck.includes('all rights reserved') ||
    textToCheck.includes('copyright') ||
    textToCheck.includes('no redistribution') ||
    textToCheck.includes('non-commercial') ||
    textToCheck.includes('proprietary')
  ) {
    return {
      acceptable: false,
      reason: `License "${license}" does not permit unrestricted community redistribution.`,
    };
  }

  // Default fallback for unrecognized license
  return {
    acceptable: false,
    reason: `Unverified license: "${license}". Must be CC0, CC-BY, CC-BY-SA, MIT, or verified HCC Community permit.`,
  };
}

/**
 * Validates technical Discord sticker requirements:
 *  - Name: 2 - 30 characters
 *  - Description: <= 100 characters
 *  - Tags: non-empty
 *  - Size: <= 512 KB
 *  - Format: png, apng, gif
 *
 * @param {Object} candidate
 * @returns {{ valid: boolean, reason?: string }}
 */
export function checkDiscordCompatibility(candidate) {
  const name = (candidate.name || '').trim();
  if (name.length < 2 || name.length > 30) {
    return {
      valid: false,
      reason: `Sticker name "${name}" length (${name.length}) must be between 2 and 30 characters.`,
    };
  }

  const desc = candidate.description || '';
  if (desc.length > 100) {
    return {
      valid: false,
      reason: `Description length (${desc.length}) exceeds Discord maximum of 100 characters.`,
    };
  }

  if (!candidate.tags || candidate.tags.trim().length === 0) {
    return {
      valid: false,
      reason: 'Discord stickers require at least one autocomplete emoji tag.',
    };
  }

  const format = (candidate.asset_format || 'png').toLowerCase().trim();
  if (!ALLOWED_ASSET_FORMATS.has(format)) {
    return {
      valid: false,
      reason: `Asset format "${format}" is unsupported. Must be PNG, APNG, GIF, or Lottie.`,
    };
  }

  if (candidate.file_size_bytes && candidate.file_size_bytes > MAX_DISCORD_STICKER_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Asset file size (${Math.round(candidate.file_size_bytes / 1024)} KB) exceeds Discord 512 KB limit.`,
    };
  }

  if (!candidate.asset_url || !candidate.asset_url.startsWith('http')) {
    return {
      valid: false,
      reason: 'Invalid or missing asset URL.',
    };
  }

  return { valid: true };
}

/**
 * Runs the comprehensive verification pipeline on a candidate.
 *
 * @param {Object} candidate
 * @returns {{
 *   valid: boolean,
 *   contentStatus: 'verified'|'flagged_profanity'|'flagged_license'|'flagged_quality',
 *   reason?: string
 * }}
 */
export function verifyCandidate(candidate) {
  // 1. Check text moderation on name, description, tags, and trend reason
  const combinedText = `${candidate.name || ''} ${candidate.description || ''} ${candidate.trend_reason || ''}`;
  const textMod = checkTextModeration(combinedText);
  if (!textMod.clean) {
    logger.warn('Sticker rejected: profanity or vulgar content detected', {
      candidate: candidate.name,
      pattern: textMod.matchedPattern,
    });
    return {
      valid: false,
      contentStatus: 'flagged_profanity',
      reason: 'Contains profanity, vulgarity, or inappropriate text.',
    };
  }

  // 2. Check licensing & redistribution rights
  const licenseCheck = checkLicenseValidity(candidate.license, candidate.license_details);
  if (!licenseCheck.acceptable) {
    logger.warn('Sticker rejected: license check failed', {
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

  // 3. Check Discord format & technical constraints
  const discordCheck = checkDiscordCompatibility(candidate);
  if (!discordCheck.valid) {
    logger.warn('Sticker rejected: Discord compatibility check failed', {
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

