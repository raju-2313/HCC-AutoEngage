/**
 * src/services/recognition/engagementScoringService.js
 * Unified HCC Community Engagement Leaderboard Engine and Scorecard Builders.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { fetchEngagementLeaderboard, getMemberEngagementSummary } from '../../database/queries/engagement.js';

const HR = '┄'.repeat(30);
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function rankLabel(index) {
  return RANK_MEDALS[index] ?? `\`#${String(index + 1).padStart(2, '0')}\``;
}

function miniProgressBar(pct, segments = 10) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled);
}

// ─── Interactive Timeframe ActionRow ──────────────────────────────────────────

export function buildLeaderboardActionRow(activePeriod = 'weekly') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_view:weekly')
      .setLabel('Weekly')
      .setEmoji('⚡')
      .setStyle(activePeriod === 'weekly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_view:monthly')
      .setLabel('Monthly')
      .setEmoji('📅')
      .setStyle(activePeriod === 'monthly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_view:all_time')
      .setLabel('All-Time')
      .setEmoji('🏆')
      .setStyle(activePeriod === 'all_time' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

// ─── Unified Overall Community Engagement Leaderboard ─────────────────────────

export async function buildOverallLeaderboardEmbed(periodType = 'weekly') {
  const rows = await fetchEngagementLeaderboard(periodType, 10);
  const periodLabel = periodType === 'weekly' ? 'Weekly Standings (Last 7 Days)' : periodType === 'monthly' ? 'Monthly Standings' : 'All-Time Hall of Fame';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🏆  HCC Community Engagement Leaderboard`)
    .setDescription(
      `## 🌟  ${periodLabel}\n` +
      `> Overall community ranking balancing **Learning** (40%), **Discussions** (25%), **Voice** (15%), **Reactions** (10%), and **Contributions** (10%).\n${HR}\n\n`
    )
    .setFooter({
      text: 'HCC AutoEngage • Balanced multi-category ranking | Switch timeframes with buttons below',
    })
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription(
      `## 🌟  ${periodLabel}\n` +
      `> Overall community ranking balancing **Learning** (40%), **Discussions** (25%), **Voice** (15%), **Reactions** (10%), and **Contributions** (10%).\n${HR}\n\n` +
      `> *No engagement activity recorded yet for this period!*\n` +
      `> _Start participating in tech channels, solving daily quizzes, and joining study sessions to take the #1 spot!_\n\n${HR}`
    );
    return embed;
  }

  const lines = rows.map((r, i) => {
    const medal = rankLabel(i);
    const mention = r.discord_id ? `<@${r.discord_id}>` : `**${r.username}**`;
    const scoreBar = miniProgressBar(r.overall_score, 10);
    const breakdown = [
      `🧠 Learn: \`${Math.round(r.learning_score)}%\``,
      `💬 Chat: \`${Math.round(r.text_score)}%\``,
      `🎙️ Voice: \`${Math.round(r.voice_score)}%\``,
      `❤️ Support: \`${Math.round(r.reaction_score)}%\``,
      `🤝 Collab: \`${Math.round(r.contribution_score)}%\``,
    ].join('  ·  ');

    if (i < 3) {
      return (
        `${medal}  ${mention}\n` +
        `╰  \`${scoreBar}\`  **Overall Score: ${r.overall_score}**\n` +
        `    ${breakdown}`
      );
    }

    return (
      `${medal}  ${mention} — **${r.overall_score}** Score  ·  \`${scoreBar}\`\n` +
      `    ${breakdown}`
    );
  });

  embed.setDescription(
    `## 🌟  ${periodLabel}\n` +
    `> Overall community ranking balancing **Learning** (40%), **Discussions** (25%), **Voice** (15%), **Reactions** (10%), and **Contributions** (10%).\n${HR}\n\n` +
    lines.join('\n\n') +
    `\n\n${HR}\n_Normalized across all 5 dimensions so learning, participation, and teamwork are all rewarded fairly._`
  );

  return embed;
}

// ─── Member Engagement Scorecard (/engagement me) ─────────────────────────────

export async function buildMemberEngagementCard(discordUser) {
  const summary = await getMemberEngagementSummary(discordUser.id);
  const s = summary?.thirtyDays || {
    textPoints: 0,
    reactionPoints: 0,
    voicePoints: 0,
    voiceMinutes: 0,
    contributionPoints: 0,
    messageCount: 0,
    reactionCount: 0,
    activeDays: 0,
  };
  const member = summary?.member || {};

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📊  ${discordUser.username} — 30-Day Engagement Profile`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .setDescription(
      `> Comprehensive activity breakdown for <@${discordUser.id}>\n${HR}`
    )
    .addFields(
      {
        name: '🧠  Learning & Quizzes',
        value: `**${member.quizzes_completed || 0}** quizzes completed\n**${member.total_xp || 0}** Total XP  ·  Level ${member.level || 1}`,
        inline: true,
      },
      {
        name: '💬  Text Participation',
        value: `**${s.textPoints}** points\n${s.messageCount} messages across channels`,
        inline: true,
      },
      {
        name: '🎙️  Voice & Study Sessions',
        value: `**${s.voicePoints}** points\n${s.voiceMinutes} total connected minutes`,
        inline: true,
      },
      {
        name: '❤️  Reactions & Support',
        value: `**${s.reactionPoints}** points\n${s.reactionCount} reactions added`,
        inline: true,
      },
      {
        name: '🤝  Community Contributions',
        value: `**${s.contributionPoints}** points\nPeer thanks & verified awards`,
        inline: true,
      },
      {
        name: '📅  Consistency',
        value: `**${s.activeDays}** active days in last 30d\n**${member.streak_current || 0}** day daily streak 🔥`,
        inline: true,
      }
    )
    .setFooter({
      text: 'HCC AutoEngage • Balanced scores reward learning, discussion & collaboration!',
    })
    .setTimestamp();

  return embed;
}
