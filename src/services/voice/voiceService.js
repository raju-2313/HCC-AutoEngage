/**
 * src/services/voice/voiceService.js
 * Persistent voice session tracking, anti-farming protection, and crash recovery.
 */

import { logger } from '../../utils/logger.js';
import {
  recordVoiceSessionStart,
  recordVoiceSessionEnd,
  getActiveVoiceSession,
  reconcileOrphanedVoiceSessions,
} from '../../database/queries/engagement.js';

/**
 * Handles voice channel state transitions.
 */
export async function handleVoiceStateChange(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const discordId = member.id;
  const username  = member.user.username;

  const isAfkChannel = (channel) => {
    if (!channel) return false;
    if (channel.id === channel.guild.afkChannelId) return true;
    return channel.name?.toLowerCase().includes('afk');
  };

  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // ── Scenario A: Left voice or moved to AFK ─────────────────────────────────
  if (oldChannel && (!newChannel || isAfkChannel(newChannel))) {
    const active = await getActiveVoiceSession(discordId);
    if (active) {
      const res = await recordVoiceSessionEnd(active.id);
      logger.info('Voice session ended', {
        user: username,
        durationSeconds: res.duration_seconds,
        points: res.points_awarded,
      });
    }
    return;
  }

  // ── Scenario B: Switched channels ──────────────────────────────────────────
  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    if (!isAfkChannel(oldChannel)) {
      const active = await getActiveVoiceSession(discordId);
      if (active) {
        await recordVoiceSessionEnd(active.id);
      }
    }
    if (!isAfkChannel(newChannel)) {
      await recordVoiceSessionStart({
        discordId,
        username,
        channelId: newChannel.id,
      });
    }
    return;
  }

  // ── Scenario C: Joined voice from disconnected state ───────────────────────
  if (!oldChannel && newChannel && !isAfkChannel(newChannel)) {
    await recordVoiceSessionStart({
      discordId,
      username,
      channelId: newChannel.id,
    });
    logger.info('Voice session started', { user: username, channel: newChannel.name });
  }
}

/**
 * Reconciles open sessions across bot restarts.
 * Closes un-ended sessions in DB and registers currently connected members.
 */
export async function initializeVoiceRecovery(client) {
  try {
    logger.info('Reconciling active voice states across guilds…');
    await reconcileOrphanedVoiceSessions();

    let resumedCount = 0;
    for (const guild of client.guilds.cache.values()) {
      for (const [memberId, voiceState] of guild.voiceStates.cache.entries()) {
        const member = voiceState.member;
        if (!member || member.user.bot) continue;
        if (voiceState.channel && voiceState.channel.id !== guild.afkChannelId) {
          await recordVoiceSessionStart({
            discordId: memberId,
            username: member.user.username,
            channelId: voiceState.channel.id,
          });
          resumedCount++;
        }
      }
    }

    logger.info(`Voice recovery complete: ${resumedCount} live active connections registered.`);
  } catch (err) {
    logger.warn('Non-fatal error during voice session recovery', { error: err.message });
  }
}
