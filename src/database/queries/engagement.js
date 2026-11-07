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

  // Gracefully conclude any existing active sessions so previous duration is not lost
  const existingActive = await getActiveVoiceSession(discordId);
  if (existingActive) {
    await recordVoiceSessionEnd(existingActive.id, new Date().toISOString()).catch(() => {});
  }

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
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0];
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
  const { data: activeList, error: listError } = await supabaseAdmin
    .from('voice_sessions')
    .select('id, discord_id, channel_id, joined_at')
    .eq('status', 'active');

  if (listError || !activeList || activeList.length === 0) {
    return [];
  }

  const nowIso = new Date().toISOString();
  const results = [];
  for (const session of activeList) {
    try {
      const res = await recordVoiceSessionEnd(session.id, nowIso);
      results.push({ id: session.id, discord_id: session.discord_id, ...res });
    } catch (err) {
      logger.warn('Failed to gracefully close orphaned voice session', { sessionId: session.id, error: err.message });
    }
  }

  logger.info(`Reconciled ${results.length} active voice sessions safely with earned points.`);
  return results;
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

  try {
    await supabaseAdmin.rpc('record_points_transaction', {
      p_discord_id: recipientDiscordId,
      p_points_delta: Math.round(points),
      p_xp_delta: Math.round(points * 2),
      p_reason: `contribution:${type}`,
      p_reference_id: data.id,
      p_awarded_by: giverDiscordId,
    });
  } catch (err) {
    logger.warn('Points transaction for contribution skipped', { error: err.message });
  }

  return data;
}

// ─── Engagement Leaderboard & Profiles ────────────────────────────────────────

export async function fetchEngagementLeaderboard(periodType = 'weekly', limit = 10) {
  let sinceDate;
  let sinceIso;
  const now = new Date();

  if (periodType === 'weekly') {
    sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    sinceDate = sinceIso.split('T')[0];
  } else if (periodType === 'monthly') {
    sinceIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    sinceDate = sinceIso.split('T')[0];
  } else {
    // all_time: 1 year lookback
    sinceIso = new Date(now.getFullYear() - 1, 0, 1).toISOString();
    sinceDate = sinceIso.split('T')[0];
  }

  try {
    // 1. Fetch score settings (weights)
    const settings = await getEngagementScoreSettings();
    const learningWeight = Number(settings?.learning_weight ?? 0.40);
    const textWeight     = Number(settings?.text_weight ?? 0.25);
    const reactionWeight = Number(settings?.reaction_weight ?? 0.10);
    const voiceWeight    = Number(settings?.voice_weight ?? 0.15);
    const contribWeight  = Number(settings?.contribution_weight ?? 0.10);

    // Benchmarks for 0-100 normalization
    const bLearning = 80.0;
    const bText     = 120.0;
    const bReaction = 30.0;
    const bVoice    = 60.0;
    const bContrib  = 40.0;

    // 2. Fetch all members
    const { data: members, error: mErr } = await supabaseAdmin
      .from('members')
      .select('id, discord_id, username');
    if (mErr) throw mErr;

    // 3. Independent queries for each category (prevents Cartesian join explosion)
    const [learningRes, dailyStatsRes, contribRes, activeVoiceRes] = await Promise.all([
      supabaseAdmin
        .from('points_history')
        .select('member_id, amount')
        .gte('created_at', sinceIso)
        .ilike('reason', '%quiz%'),
      supabaseAdmin
        .from('engagement_daily_stats')
        .select('member_id, text_points, reaction_points, voice_points')
        .gte('stat_date', sinceDate),
      supabaseAdmin
        .from('contribution_recognitions')
        .select('recipient_member_id, points')
        .gte('created_at', sinceIso)
        .eq('verified', true),
      supabaseAdmin
        .from('voice_sessions')
        .select('member_id, joined_at')
        .eq('status', 'active'),
    ]);

    const memberMap = new Map();
    for (const m of (members || [])) {
      memberMap.set(m.id, {
        member_id: m.id,
        discord_id: m.discord_id,
        username: m.username,
        raw_learning: 0,
        raw_text: 0,
        raw_reaction: 0,
        raw_voice: 0,
        raw_contribution: 0,
      });
    }

    for (const l of (learningRes.data || [])) {
      const entry = memberMap.get(l.member_id);
      if (entry) entry.raw_learning += Number(l.amount || 0);
    }

    for (const d of (dailyStatsRes.data || [])) {
      const entry = memberMap.get(d.member_id);
      if (entry) {
        entry.raw_text += Number(d.text_points || 0);
        entry.raw_reaction += Number(d.reaction_points || 0);
        entry.raw_voice += Number(d.voice_points || 0);
      }
    }

    for (const c of (contribRes.data || [])) {
      const entry = memberMap.get(c.recipient_member_id);
      if (entry) entry.raw_contribution += Number(c.points || 0);
    }

    // Account for ongoing live voice sessions
    for (const av of (activeVoiceRes.data || [])) {
      const entry = memberMap.get(av.member_id);
      if (entry && av.joined_at) {
        const liveSec = Math.max(0, Math.floor((Date.now() - new Date(av.joined_at).getTime()) / 1000));
        entry.raw_voice += (liveSec / 60) * 0.5;
      }
    }

    const rows = [];
    for (const e of memberMap.values()) {
      const norm_learning = Math.min(100, (e.raw_learning / bLearning) * 100);
      const norm_text = Math.min(100, (e.raw_text / bText) * 100);
      const norm_reaction = Math.min(100, (e.raw_reaction / bReaction) * 100);
      const norm_voice = Math.min(100, (e.raw_voice / bVoice) * 100);
      const norm_contribution = Math.min(100, (e.raw_contribution / bContrib) * 100);

      let activeCategories = 0;
      if (e.raw_learning > 0) activeCategories++;
      if (e.raw_text > 0) activeCategories++;
      if (e.raw_reaction > 0) activeCategories++;
      if (e.raw_voice > 0) activeCategories++;
      if (e.raw_contribution > 0) activeCategories++;

      const baseScore =
        (norm_learning * learningWeight) +
        (norm_text * textWeight) +
        (norm_reaction * reactionWeight) +
        (norm_voice * voiceWeight) +
        (norm_contribution * contribWeight);

      const synergy = activeCategories >= 4 ? 1.05 : 1.00;
      const overall = Number((baseScore * synergy).toFixed(2));

      if (overall > 0) {
        rows.push({
          member_id: e.member_id,
          discord_id: e.discord_id,
          username: e.username,
          learning_score: Number(norm_learning.toFixed(1)),
          text_score: Number(norm_text.toFixed(1)),
          reaction_score: Number(norm_reaction.toFixed(1)),
          voice_score: Number(norm_voice.toFixed(1)),
          contribution_score: Number(norm_contribution.toFixed(1)),
          overall_score: overall,
        });
      }
    }

    rows.sort((a, b) => b.overall_score - a.overall_score);
    rows.forEach((r, idx) => { r.rank = idx + 1; });

    return rows.slice(0, limit);
  } catch (err) {
    logger.error('Error fetching engagement leaderboard via direct aggregation', { error: err.message });
    // Fallback to RPC if necessary
    const periodId = periodType === 'weekly' ? `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}` : `${now.getFullYear()}-${now.getMonth() + 1}`;
    const { data: rpcData } = await supabaseAdmin.rpc('calculate_engagement_leaderboard', {
      p_period_type: periodType,
      p_period_identifier: periodId,
      p_since: sinceIso,
    });
    return (rpcData || []).slice(0, limit);
  }
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
  let voicePoints = stats.reduce((acc, d) => acc + Number(d.voice_points || 0), 0);
  let voiceSeconds = stats.reduce((acc, d) => acc + Number(d.voice_seconds || 0), 0);
  const messageCount = stats.reduce((acc, d) => acc + Number(d.message_count || 0), 0);
  const reactionCount = stats.reduce((acc, d) => acc + Number(d.reaction_count || 0), 0);
  const activeDays = stats.filter((d) => (d.message_count > 0 || d.reaction_count > 0 || d.voice_seconds > 0 || d.learning_points > 0)).length;

  const { data: contributions } = await supabaseAdmin
    .from('contribution_recognitions')
    .select('points')
    .eq('recipient_member_id', m.id)
    .gte('created_at', thirtyDaysAgo);

  const contributionPoints = (contributions || []).reduce((acc, c) => acc + Number(c.points || 0), 0);

  // Real-time active voice session check
  const activeVoice = await getActiveVoiceSession(discordId);
  let isCurrentlyInVoice = false;
  let activeVoiceMinutes = 0;
  let liveVoiceSeconds = 0;
  let liveVoicePoints = 0;

  if (activeVoice && activeVoice.joined_at) {
    isCurrentlyInVoice = true;
    liveVoiceSeconds = Math.max(0, Math.floor((Date.now() - new Date(activeVoice.joined_at).getTime()) / 1000));
    activeVoiceMinutes = Math.floor(liveVoiceSeconds / 60);
    // 0.5 points per minute
    liveVoicePoints = Number(((liveVoiceSeconds / 60) * 0.5).toFixed(2));
    voiceSeconds += liveVoiceSeconds;
    voicePoints += liveVoicePoints;
  }

  return {
    member: m,
    thirtyDays: {
      textPoints: Math.round(textPoints),
      reactionPoints: Math.round(reactionPoints),
      voicePoints: Number(voicePoints.toFixed(1)),
      voiceMinutes: Math.round(voiceSeconds / 60),
      contributionPoints: Math.round(contributionPoints),
      messageCount,
      reactionCount,
      activeDays: activeDays + (isCurrentlyInVoice && activeDays === 0 ? 1 : 0),
      isCurrentlyInVoice,
      activeVoiceMinutes,
    },
  };
}

