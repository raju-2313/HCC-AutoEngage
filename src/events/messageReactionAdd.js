/**
 * src/events/messageReactionAdd.js
 * Tracks meaningful community reaction participation.
 *
 * Rules:
 *   - Ignores bot reactions and self-reactions (author reacting to their own message).
 *   - Ignores reactions in private DMs or excluded channels.
 *   - Enforces deduplication using messageId:emoji as the reference key.
 */

import { logger } from '../utils/logger.js';
import { recordEngagementEvent } from '../database/queries/engagement.js';

export const name = 'messageReactionAdd';
export const once = false;

export async function execute(reaction, user) {
  // 1. Exclude bot reactions and reactions in DMs
  if (!user || user.bot || !reaction.message.guild) {
    return;
  }

  try {
    // If partial reaction or message, fetch details
    if (reaction.partial) {
      await reaction.fetch().catch(() => null);
    }
    if (reaction.message.partial) {
      await reaction.message.fetch().catch(() => null);
    }

    // 2. Exclude self-reactions
    if (reaction.message.author && reaction.message.author.id === user.id) {
      return;
    }

    const discordId   = user.id;
    const username    = user.username;
    const channelId   = reaction.message.channelId;
    const emojiKey    = reaction.emoji.id || reaction.emoji.name;
    const referenceId = `${reaction.message.id}:${emojiKey}:${user.id}`;

    const result = await recordEngagementEvent({
      discordId,
      username,
      eventType: 'reaction_add',
      channelId,
      referenceId,
      metadata: { emoji: reaction.emoji.name },
    });

    if (result.success && result.points_awarded > 0) {
      logger.debug('Reaction engagement awarded', {
        user: username,
        channelId,
        points: result.points_awarded,
      });
    }
  } catch (err) {
    logger.debug('Non-blocking error in messageReactionAdd handler', { error: err.message });
  }
}

