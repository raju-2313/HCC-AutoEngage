/**
 * src/services/emojis/discoveryService.js
 * Multi-provider emoji discovery and verification pipeline.
 */

import { logger } from '../../utils/logger.js';
import { Popular50EmojiProvider } from './providers/popular50EmojiProvider.js';
import { verifyEmojiCandidate } from './verificationService.js';
import { saveEmojiCandidates } from '../../database/queries/emojis.js';

class EmojiDiscoveryService {
  constructor() {
    this.providers = new Map();
    this.registerProvider(new Popular50EmojiProvider());
  }

  /**
   * Registers an emoji discovery provider.
   * @param {import('./providers/baseEmojiProvider.js').BaseEmojiProvider} provider
   */
  registerProvider(provider) {
    this.providers.set(provider.id, provider);
    logger.info(`Registered emoji discovery provider: ${provider.name} (${provider.id})`);
  }

  /**
   * Discovers new emoji candidates across all or selected providers, verifies them,
   * and saves them to the database review queue.
   *
   * @param {Object} [options={}]
   * @param {number} [options.limit=50]
   * @param {string} [options.providerId]
   * @param {string} [options.category]
   * @param {string} [options.packId]
   * @returns {Promise<{
   *   scanned: number,
   *   verified: number,
   *   flagged: number,
   *   inserted: number,
   *   skipped: number,
   *   candidates: Array<Object>
   * }>}
   */
  async runDiscoveryScan(options = {}) {
    const limit = options.limit || 50;
    const providerId = options.providerId;

    logger.info('Starting emoji discovery scan…', { limit, providerId, category: options.category });

    const rawCandidates = [];

    // 1. Gather raw candidates from providers
    for (const [id, provider] of this.providers.entries()) {
      if (providerId && id !== providerId) continue;

      try {
        const found = await provider.discover({
          limit,
          category: options.category,
        });
        rawCandidates.push(...found);
      } catch (err) {
        logger.error(`Error discovering emojis from provider: ${id}`, { error: err.message });
      }

      if (rawCandidates.length >= limit) break;
    }

    logger.info(`Discovered ${rawCandidates.length} raw emoji candidates. Running verification pipeline…`);

    // 2. Run verification pipeline
    const processedCandidates = [];
    let verifiedCount = 0;
    let flaggedCount = 0;

    for (const candidate of rawCandidates) {
      const check = verifyEmojiCandidate(candidate);

      const record = {
        name: candidate.name,
        description: candidate.description || '',
        pack_id: candidate.pack_id || 'popular_50_emojis',
        pack_name: candidate.pack_name || 'HCC Top 50 Gen Z & Tech Emojis',
        category: candidate.category || 'coding_memes',
        preview_url: candidate.preview_url,
        asset_url: candidate.asset_url,
        source_url: candidate.source_url,
        creator: candidate.creator || 'HCC Open Community',
        license: candidate.license,
        license_details: candidate.license_details || '',
        trend_reason: candidate.trend_reason || 'Trending Gen Z reaction',
        is_animated: candidate.is_animated || false,
        content_status: check.contentStatus,
        review_status: check.valid ? 'pending_review' : 'rejected',
        rejection_reason: check.valid ? null : check.reason,
        upload_status: 'not_uploaded',
        file_size_bytes: candidate.file_size_bytes || 0,
        asset_format: candidate.asset_format || 'png',
      };

      if (check.valid) {
        verifiedCount++;
      } else {
        flaggedCount++;
      }

      processedCandidates.push(record);
    }

    // 3. Persist to Supabase
    const dbResult = await saveEmojiCandidates(processedCandidates);

    logger.info('Emoji discovery scan completed', {
      scanned: processedCandidates.length,
      verified: verifiedCount,
      flagged: flaggedCount,
      inserted: dbResult.inserted,
      skipped: dbResult.skipped,
    });

    return {
      scanned: processedCandidates.length,
      verified: verifiedCount,
      flagged: flaggedCount,
      inserted: dbResult.inserted,
      skipped: dbResult.skipped,
      candidates: processedCandidates,
    };
  }
}

export const emojiDiscoveryService = new EmojiDiscoveryService();

