/**
 * src/database/queries/engagement.js
 * Database operations for the Community Engagement Engine.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';
import { upsertMember } from './members.js';

// ─── Score & Channel Settings ─────────────────────────────────────────────────

export async function getEngagementScoreSettings() {
  const { data, error } = await supabaseAdmin
    .from('engagement_score_settings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('Failed to load engagement score settings', { error: error.message });
    return null;
  }
  return data;
}

export async function updateEngagementScoreSettings(settings) {
  const current = await getEngagementScoreSettings();
  if (!current) {
    const { data, error } = await supabaseAdmin
      .from('engagement_score_settings')
      .insert({ ...settings, is_active: true, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('engagement_score_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', current.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating engagement score settings', { error: error.message });
    throw error;
  }
  return data;
}

export async function getEngagementChannelSettings(channelId) {
  const { data, error } = await supabaseAdmin
    .from('engagement_channel_settings')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();

  if (error) {
    logger.warn('Error fetching channel settings', { channelId, error: error.message });
    return null;
  }
  return data;
}

export async function setEngagementChannelSettings({ channelId, channelName, category, multiplier = 1.0, isEnabled = true, notes = null }) {
  const { data, error } = await supabaseAdmin
    .from('engagement_channel_settings')
    .upsert({
      channel_id: channelId,
      channel_name: channelName,
      category,
      multiplier,
      is_enabled: isEnabled,
      notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'channel_id' })
    .select()
    .single();

  if (error) {
    logger.error('Error setting channel engagement settings', { channelId, error: error.message });
    throw error;
  }
  return data;
}

export async function getAllEngagementChannelSettings() {
  const { data, error } = await supabaseAdmin
    .from('engagement_channel_settings')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    logger.error('Error fetching all channel settings', { error: error.message });
    return [];
  }
  return data || [];
}

// ─── Event Recording ──────────────────────────────────────────────────────────

export async function recordEngagementEvent({ discordId, username, eventType, channelId, referenceId = null, metadata = {} }) {
  // Ensure member profile exists
  await upsertMember({ discordId, username: username || discordId }).catch(() => {});

  const { data, error } = await supabaseAdmin.rpc('record_engagement_event', {
    p_discord_id: discordId,
    p_event_type: eventType,
    p_channel_id: channelId,
    p_reference_id: referenceId,
    p_metadata: metadata,
  });

  if (error) {
    logger.warn('Error recording engagement event via RPC', { discordId, eventType, error: error.message });
    return { success: false, error: error.message };
  }

  const res = Array.isArray(data) ? data[0] : data;
  return res || { success: false, points_awarded: 0, reason: 'NO_RESPONSE' };
}

// ─── Voice Session Management ─────────────────────────────────────────────────

export async function recordVoiceSessionStart({ discordId, username, channelId }) {
  const member = await upsertMember({ discordId, username: username || discordId }).catch(() => null);
  if (!member) return null;

  // Mark any older open sessions as reconciled
  await supabaseAdmin
    .from('voice_sessions')
    .update({ status: 'reconciled', left_at: new Date().toISOString() })
    .eq('discord_id', discordId)
    .eq('status', 'active');

  const { data, error } = await supabaseAdmin
    .from('voice_sessions')
    .insert({
      discord_id: discordId,
      member_id: member.id,
      channel_id: channelId,
      joined_at: new Date().toISOString(),
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error starting voice session', { discordId, channelId, error: error.message });
    return null;
  }
  return data;
}

export async function getActiveVoiceSession(discordId) {
  const { data, error } = await supabaseAdmin
    .from('voice_sessions')
    .select('*')
    .eq('discord_id', discordId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function recordVoiceSessionEnd(sessionId, leftAt = new Date().toISOString()) {
  const { data, error } = await supabaseAdmin.rpc('record_voice_session_end', {
    p_session_id: sessionId,
    p_left_at: leftAt,
  });

  if (error) {
    logger.error('Error ending voice session via RPC', { sessionId, error: error.message });
    return { success: false, error: error.message };
  }

  const res = Array.isArray(data) ? data[0] : data;
  return res || { success: false };
}

export async function reconcileOrphanedVoiceSessions() {
  const { data, error } = await supabaseAdmin
    .from('voice_sessions')
    .update({
      status: 'reconciled',
      left_at: new Date().toISOString(),
    })
    .eq('status', 'active')
    .select('id, discord_id, channel_id');

  if (error) {
    logger.warn('Error reconciling orphaned voice sessions', { error: error.message });
    return [];
  }
  return data || [];
}

// ─── Contribution Recognitions ────────────────────────────────────────────────

export async function awardCommunityContribution({
  recipientDiscordId,
  recipientUsername,
  giverDiscordId,
  type = 'moderator_award',
  points = 10,
  reason,
  channelId = null,
  messageId = null,
}) {
  if (recipientDiscordId === giverDiscordId) {
    throw new Error('Self-recognition is prohibited.');
  }

  // 24h anti-collusion check for peer recognitions
  if (type === 'peer_thanks') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('contribution_recognitions')
      .select('id')
      .eq('giver_discord_id', giverDiscordId)
      .eq('recipient_discord_id', recipientDiscordId)
      .eq('type', 'peer_thanks')
      .gte('created_at', oneDayAgo)
      .limit(1)
      .maybeSingle();

    if (existing) {
      throw new Error('COOLDOWN_ACTIVE: You can only thank this member once every 24 hours.');
    }
  }

  const recipient = await upsertMember({ discordId: recipientDiscordId, username: recipientUsername || recipientDiscordId });

  const { data, error } = await supabaseAdmin
    .from('contribution_recognitions')
    .insert({
      recipient_member_id: recipient.id,
      recipient_discord_id: recipientDiscordId,
      giver_discord_id: giverDiscordId,
      type,
      points,
      reason,
      channel_id: channelId,
      message_id: messageId,
      verified: true,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error awarding community contribution', { recipientDiscordId, giverDiscordId, error: error.message });
    throw error;
  }

  // Update daily stats for recipient
  const today = new Date().toISOString().split('T')[0];
  await supabaseAdmin
    .from('engagement_daily_stats')
    .upsert({
      member_id: recipient.id,
      discord_id: recipientDiscordId,
      stat_date: today,
    }, { onConflict: 'member_id,stat_date' });

  await supabaseAdmin.rpc('record_points_transaction', {
    p_discord_id: recipientDiscordId,
    p_points_delta: Math.round(points),
    p_xp_delta: Math.round(points * 2),
    p_reason: `contribution:${type}`,
    p_reference_id: data.id,
    p_awarded_by: giverDiscordId,
  }).catch(() => {});

  return data;
}

// ─── Engagement Leaderboard & Profiles ────────────────────────────────────────

export async function fetchEngagementLeaderboard(periodType = 'weekly', limit = 10) {
  let since;
  const now = new Date();

  if (periodType === 'weekly') {
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (periodType === 'monthly') {
    since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else {
    // all_time: 1 year lookback
    since = new Date(now.getFullYear() - 1, 0, 1).toISOString();
  }

  const periodId = periodType === 'weekly' ? `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}` : `${now.getFullYear()}-${now.getMonth() + 1}`;

  const { data, error } = await supabaseAdmin.rpc('calculate_engagement_leaderboard', {
    p_period_type: periodType,
    p_period_identifier: periodId,
    p_since: since,
  });

  if (error) {
    logger.error('Error calculating engagement leaderboard', { periodType, error: error.message });
    throw error;
  }

  const rows = data || [];
  return rows.slice(0, limit);
}

export async function getMemberEngagementSummary(discordId) {
  const member = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!member.data) return null;
  const m = member.data;

  // Aggregated last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: dailyStats } = await supabaseAdmin
    .from('engagement_daily_stats')
    .select('*')
    .eq('member_id', m.id)
    .gte('stat_date', thirtyDaysAgo);

  const stats = dailyStats || [];
  const textPoints = stats.reduce((acc, d) => acc + Number(d.text_points || 0), 0);
  const reactionPoints = stats.reduce((acc, d) => acc + Number(d.reaction_points || 0), 0);
  const voicePoints = stats.reduce((acc, d) => acc + Number(d.voice_points || 0), 0);
  const voiceSeconds = stats.reduce((acc, d) => acc + Number(d.voice_seconds || 0), 0);
  const messageCount = stats.reduce((acc, d) => acc + Number(d.message_count || 0), 0);
  const reactionCount = stats.reduce((acc, d) => acc + Number(d.reaction_count || 0), 0);
  const activeDays = stats.filter((d) => (d.message_count > 0 || d.reaction_count > 0 || d.voice_seconds > 0 || d.learning_points > 0)).length;

  const { data: contributions } = await supabaseAdmin
    .from('contribution_recognitions')
    .select('points')
    .eq('recipient_member_id', m.id)
    .gte('created_at', thirtyDaysAgo);

  const contributionPoints = (contributions || []).reduce((acc, c) => acc + Number(c.points || 0), 0);

  return {
    member: m,
    thirtyDays: {
      textPoints: Math.round(textPoints),
      reactionPoints: Math.round(reactionPoints),
      voicePoints: Math.round(voicePoints),
      voiceMinutes: Math.round(voiceSeconds / 60),
      contributionPoints: Math.round(contributionPoints),
      messageCount,
      reactionCount,
      activeDays,
    },
  };
}
