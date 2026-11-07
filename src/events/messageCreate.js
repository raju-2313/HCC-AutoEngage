/**
 * src/events/messageCreate.js
 * Tracks privacy-safe text channel participation metadata.
 *
 * Privacy Guarantees:
 *   - Zero message content is read or stored.
 *   - Bot messages, webhook messages, system messages, and private DMs are ignored.
 *   - Only channel ID, author ID, timestamp, and metadata (e.g. attachment flag) are recorded.
 */

import { logger } from '../utils/logger.js';
import { recordEngagementEvent } from '../database/queries/engagement.js';
import { recordDailyParticipation } from '../database/queries/members.js';

export const name = 'messageCreate';
export const once = false;

export async function execute(message) {
  // 1. Exclude bot messages, webhooks, system messages, and DMs
  if (!message || message.author?.bot || message.webhookId || message.system || !message.guild) {
    return;
  }

  try {
    const discordId  = message.author.id;
    const username   = message.author.username;
    const channelId  = message.channelId;
    const hasAttachments = message.attachments?.size > 0;

    // Record daily participation streak for active chat engagement
    recordDailyParticipation(discordId, 'chat_message').catch(() => {});

    // Record engagement event atomically via RPC
    const result = await recordEngagementEvent({
      discordId,
      username,
      eventType: 'message',
      channelId,
      referenceId: message.id,
      metadata: { hasAttachments },
    });

    if (result.success && result.points_awarded > 0) {
      logger.debug('Message engagement awarded', {
        user: username,
        channelId,
        points: result.points_awarded,
      });
    }
  } catch (err) {
    logger.debug('Non-blocking error in messageCreate handler', { error: err.message });
  }
}

