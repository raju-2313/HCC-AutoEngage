/**
 * src/database/queries/emojis.js
 * Database queries for Emoji Discovery, Moderation, and Uploads.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

const TABLE = 'emoji_candidates';

/**
 * Saves newly discovered emoji candidates, ignoring duplicates on (name, pack_id).
 * @param {Array<Object>} candidates
 * @returns {Promise<{ inserted: number, skipped: number, data: Array<Object> }>}
 */
export async function saveEmojiCandidates(candidates) {
  if (!candidates || candidates.length === 0) {
    return { inserted: 0, skipped: 0, data: [] };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(candidates, {
        onConflict: 'name,pack_id',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      logger.error('Failed to save emoji candidates', { error: error.message });
      return { inserted: 0, skipped: candidates.length, data: [], error: error.message };
    }

    const insertedCount = data ? data.length : 0;
    const skippedCount = candidates.length - insertedCount;

    return { inserted: insertedCount, skipped: skippedCount, data: data || [] };
  } catch (err) {
    logger.error('Exception in saveEmojiCandidates', { error: err.message });
    return { inserted: 0, skipped: candidates.length, data: [], error: err.message };
  }
}

/**
 * Retrieves candidates pending administrator review.
 * @param {Object} options
 * @param {number} [options.limit=25]
 * @param {number} [options.offset=0]
 * @param {string} [options.category]
 * @param {string} [options.packId]
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingEmojiCandidates(options = {}) {
  const { limit = 25, offset = 0, category, packId } = options;

  try {
    let query = supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('review_status', 'pending_review')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);
    if (packId) query = query.eq('pack_id', packId);

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch pending emoji candidates', { error: error.message });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Exception in getPendingEmojiCandidates', { error: err.message });
    return [];
  }
}

/**
 * Retrieves a single candidate by UUID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getEmojiCandidateById(id) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch emoji candidate by ID', { id, error: error.message });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Exception in getEmojiCandidateById', { id, error: err.message });
    return null;
  }
}

/**
 * Retrieves all candidates in a specific pack.
 * @param {string} packId
 * @returns {Promise<Array<Object>>}
 */
export async function getEmojiCandidatesByPackId(packId) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('pack_id', packId)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Failed to fetch candidates by pack ID', { packId, error: error.message });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Exception in getEmojiCandidatesByPackId', { packId, error: err.message });
    return [];
  }
}

/**
 * Updates review status for an individual emoji candidate.
 * @param {string} id
 * @param {Object} updateData
 * @param {'approved'|'rejected'} updateData.reviewStatus
 * @param {string} updateData.approvedBy
 * @param {string} [updateData.rejectionReason]
 * @returns {Promise<Object|null>}
 */
export async function updateEmojiCandidateReviewStatus(id, { reviewStatus, approvedBy, rejectionReason }) {
  try {
    const payload = {
      review_status: reviewStatus,
      approved_by: approvedBy || null,
      approved_at: reviewStatus === 'approved' ? new Date().toISOString() : null,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update emoji candidate review status', { id, error: error.message });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Exception in updateEmojiCandidateReviewStatus', { id, error: err.message });
    return null;
  }
}

/**
 * Updates review status for an entire pack of emojis.
 * @param {string} packId
 * @param {Object} updateData
 * @param {'approved'|'rejected'} updateData.reviewStatus
 * @param {string} updateData.approvedBy
 * @param {string} [updateData.rejectionReason]
 * @returns {Promise<Array<Object>>}
 */
export async function updateEmojiPackReviewStatus(packId, { reviewStatus, approvedBy, rejectionReason }) {
  try {
    const payload = {
      review_status: reviewStatus,
      approved_by: approvedBy || null,
      approved_at: reviewStatus === 'approved' ? new Date().toISOString() : null,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq('pack_id', packId)
      .eq('review_status', 'pending_review')
      .select();

    if (error) {
      logger.error('Failed to update emoji pack review status', { packId, error: error.message });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Exception in updateEmojiPackReviewStatus', { packId, error: err.message });
    return [];
  }
}

/**
 * Updates the upload status and records Discord emoji ID or upload errors.
 * @param {string} id
 * @param {Object} uploadInfo
 * @param {'not_uploaded'|'uploading'|'uploaded'|'failed'|'skipped_slots'} uploadInfo.uploadStatus
 * @param {string} [uploadInfo.discordEmojiId]
 * @param {string} [uploadInfo.uploadError]
 * @returns {Promise<Object|null>}
 */
export async function updateEmojiCandidateUploadStatus(id, { uploadStatus, discordEmojiId, uploadError }) {
  try {
    const payload = {
      upload_status: uploadStatus,
      discord_emoji_id: discordEmojiId || null,
      upload_error: uploadError || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update emoji upload status', { id, error: error.message });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Exception in updateEmojiCandidateUploadStatus', { id, error: err.message });
    return null;
  }
}

/**
 * Retrieves candidates that are approved and ready to be uploaded to Discord.
 * @param {number} [limit=50]
 * @returns {Promise<Array<Object>>}
 */
export async function getApprovedUnuploadedEmojis(limit = 50) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('review_status', 'approved')
      .in('upload_status', ['not_uploaded', 'failed', 'skipped_slots'])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch approved unuploaded emojis', { error: error.message });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Exception in getApprovedUnuploadedEmojis', { error: err.message });
    return [];
  }
}

/**
 * Updates verification content status after rescanning.
 * @param {string} id
 * @param {Object} verificationResult
 * @param {string} verificationResult.contentStatus
 * @param {string} [verificationResult.rejectionReason]
 */
export async function updateEmojiVerificationStatus(id, { contentStatus, rejectionReason }) {
  try {
    const payload = {
      content_status: contentStatus,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString(),
    };

    if (contentStatus.startsWith('flagged_')) {
      payload.review_status = 'rejected';
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Failed to update emoji verification status', { id, error: error.message });
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Exception in updateEmojiVerificationStatus', { id, error: err.message });
    return null;
  }
}

/**
 * Returns emoji moderation and upload counts.
 * @returns {Promise<Object>}
 */
export async function getEmojiStats() {
  try {
    const [
      { count: pendingCount },
      { count: approvedCount },
      { count: uploadedCount },
      { count: rejectedCount },
    ] = await Promise.all([
      supabaseAdmin.from(TABLE).select('*', { count: 'exact', head: true }).eq('review_status', 'pending_review'),
      supabaseAdmin.from(TABLE).select('*', { count: 'exact', head: true }).eq('review_status', 'approved'),
      supabaseAdmin.from(TABLE).select('*', { count: 'exact', head: true }).eq('upload_status', 'uploaded'),
      supabaseAdmin.from(TABLE).select('*', { count: 'exact', head: true }).eq('review_status', 'rejected'),
    ]);

    return {
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      uploaded: uploadedCount || 0,
      rejected: rejectedCount || 0,
    };
  } catch (err) {
    logger.error('Exception in getEmojiStats', { error: err.message });
    return { pending: 0, approved: 0, uploaded: 0, rejected: 0 };
  }
}

