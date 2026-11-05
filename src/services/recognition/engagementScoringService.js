/**
 * src/services/recognition/engagementScoringService.js
 * Builds overall community engagement leaderboards, category views, and profile scorecards.
 */

import { EmbedBuilder } from 'discord.js';
import { fetchEngagementLeaderboard, getMemberEngagementSummary } from '../../database/queries/engagement.js';
import { COLORS } from '../../utils/embeds.js';

const HR = '┄'.repeat(28);
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function rankLabel(index) {
  return RANK_MEDALS[index] ?? `\`#${String(index + 1).padStart(2, '0')}\``;
}

function miniProgressBar(pct, segments = 8) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled);
}

// ─── 1. Overall Community Engagement Leaderboard ──────────────────────────────

export async function buildOverallLeaderboardEmbed(periodType = 'weekly') {
  const rows = await fetchEngagementLeaderboard(periodType, 10);
  const periodLabel = periodType === 'weekly' ? 'Weekly' : periodType === 'monthly' ? 'Monthly' : 'All-Time';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🌟  HCC Overall Community Leaderboard — ${periodLabel}`)
    .setDescription(
      `> The primary ranking of students contributing across **Learning**, **Collaboration**, and **Community**.\n${HR}\n\n`
    )
    .setFooter({
      text: `HCC AutoEngage • Balanced Engagement (Learning 40% | Text 25% | Voice 15% | Reactions 10% | Contributions 10%)`,
    })
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription(
      `> *No engagement activity recorded yet for this period!*\n> _Start participating in tech channels, quizzes, and voice study sessions to climb!_\n\n${HR}`
    );
    return embed;
  }

  const lines = rows.map((r, i) => {
    const medal = rankLabel(i);
    const mention = r.discord_id ? `<@${r.discord_id}>` : `**${r.username}**`;
    const scoreBar = miniProgressBar(r.overall_score, 8);
    const breakdown = `\`L:${Math.round(r.learning_score)} T:${Math.round(r.text_score)} V:${Math.round(r.voice_score)} R:${Math.round(r.reaction_score)} C:${Math.round(r.contribution_score)}\``;

    if (i < 3) {
      return (
        `${medal}  ${mention}\n` +
        `╰  \`${scoreBar}\`  **${r.overall_score} Score**  ·  Breakdown: ${breakdown}`
      );
    }
    return `${medal}  ${mention} — **${r.overall_score}** pts  ·  ${breakdown}`;
  });

  embed.setDescription(
    `> Primary community ranking (Learning 40% · Text 25% · Voice 15% · Reactions 10% · Contributions 10%)\n${HR}\n\n` +
    lines.join('\n\n') +
    `\n\n${HR}\n_Scores are normalized across categories to reward balanced community contributions._`
  );

  return embed;
}

// ─── 2. Category Leaderboards ─────────────────────────────────────────────────

export async function buildCategoryLeaderboardEmbed(category = 'social', periodType = 'weekly') {
  const rows = await fetchEngagementLeaderboard(periodType, 10);
  const periodLabel = periodType === 'weekly' ? 'Weekly' : 'Monthly';

  let title = '💬  Social & Text Engagement Leaderboard';
  let color = COLORS.info;
  let scoreGetter = (r) => r.text_score;
  let metricLabel = 'Text Score';

  if (category === 'voice') {
    title = '🎙️  Voice & Study Session Leaderboard';
    color = 0x9B59B6;
    scoreGetter = (r) => r.voice_score;
    metricLabel = 'Voice Score';
  } else if (category === 'learning') {
    title = '🧠  Learning & Challenge Leaderboard';
    color = COLORS.primary;
    scoreGetter = (r) => r.learning_score;
    metricLabel = 'Learning Score';
  }

  // Sort rows by the specific category score
  const sorted = [...rows].sort((a, b) => scoreGetter(b) - scoreGetter(a));

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${title} — ${periodLabel}`)
    .setTimestamp()
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' });

  if (sorted.length === 0 || scoreGetter(sorted[0]) === 0) {
    embed.setDescription(`> *No activity recorded for ${metricLabel} during this period yet.*`);
    return embed;
  }

  const lines = sorted.map((r, i) => {
    const medal = rankLabel(i);
    const mention = r.discord_id ? `<@${r.discord_id}>` : `**${r.username}**`;
    const score = Math.round(scoreGetter(r));
    const bar = miniProgressBar(score, 8);
    return `${medal}  ${mention}\n╰  \`${bar}\`  **${score}** ${metricLabel}`;
  });

  embed.setDescription(
    `> Ranked by ${metricLabel} (${periodLabel})\n${HR}\n\n` +
    lines.join('\n\n')
  );

  return embed;
}

// ─── 3. Member Engagement Scorecard (/engagement me) ─────────────────────────

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
