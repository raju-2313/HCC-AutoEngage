/**
 * src/services/stickers/discoveryService.js
 * Orchestrates multi-provider sticker discovery and verification pipeline.
 */

import { logger } from '../../utils/logger.js';
import { OpenMojiProvider } from './providers/openMojiProvider.js';
import { CuratedCommunityPackProvider } from './providers/curatedCommunityPackProvider.js';
import { verifyCandidate } from './verificationService.js';
import { saveStickerCandidates } from '../../database/queries/stickers.js';

class DiscoveryService {
  constructor() {
    this.providers = new Map();
    this.registerProvider(new CuratedCommunityPackProvider());
    this.registerProvider(new OpenMojiProvider());
  }

  /**
   * Registers a sticker discovery provider.
   * @param {import('./providers/baseProvider.js').BaseStickerProvider} provider
   */
  registerProvider(provider) {
    this.providers.set(provider.id, provider);
    logger.info(`Registered sticker discovery provider: ${provider.name} (${provider.id})`);
  }

  /**
   * Discovers new candidates across all or selected providers, verifies them,
   * and saves them to the database review queue.
   *
   * @param {Object} [options={}]
   * @param {number} [options.limit=15]
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
    const limit = options.limit || 15;
    const providerId = options.providerId;

    logger.info('Starting sticker discovery scan…', { limit, providerId, category: options.category });

    const rawCandidates = [];

    // 1. Gather raw candidates from providers
    for (const [id, provider] of this.providers.entries()) {
      if (providerId && id !== providerId) continue;

      try {
        const found = await provider.discover({
          limit,
          category: options.category,
          packId: options.packId,
        });
        rawCandidates.push(...found);
      } catch (err) {
        logger.error(`Error discovering stickers from provider: ${id}`, { error: err.message });
      }

      if (rawCandidates.length >= limit * 2) break;
    }

    logger.info(`Discovered ${rawCandidates.length} raw candidates. Running verification pipeline…`);

    // 2. Run verification pipeline
    const processedCandidates = [];
    let verifiedCount = 0;
    let flaggedCount = 0;

    for (const candidate of rawCandidates) {
      const check = verifyCandidate(candidate);

      const record = {
        name: candidate.name,
        description: candidate.description || '',
        tags: candidate.tags || '🏷️',
        pack_id: candidate.pack_id || 'default_pack',
        pack_name: candidate.pack_name || 'Community Pack',
        category: candidate.category || 'coding_memes',
        preview_url: candidate.preview_url,
        asset_url: candidate.asset_url,
        source_url: candidate.source_url,
        creator: candidate.creator || 'Unknown Artist',
        license: candidate.license,
        license_details: candidate.license_details || '',
        trend_reason: candidate.trend_reason || 'Trending Gen Z reaction',
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
    const dbResult = await saveStickerCandidates(processedCandidates);

    logger.info('Sticker discovery scan completed', {
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

export const discoveryService = new DiscoveryService();

