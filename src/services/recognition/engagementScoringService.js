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
import { getRandomLeaderboardTip } from '../../utils/leaderboardTips.js';

const HR = '───────────────────────';

const RANK_BADGES = {
  1: { medal: '🥇', label: 'Champion', title: 'Season Leader 👑' },
  2: { medal: '🥈', label: '2nd Place', title: 'Runner-Up ⚡' },
  3: { medal: '🥉', label: '3rd Place', title: 'Podium Contender 🌟' },
};

function modernBar(score, total = 10) {
  const filled = Math.max(0, Math.min(total, Math.round((score / 100) * total)));
  return '▰'.repeat(filled) + '▱'.repeat(total - filled);
}

// ─── Interactive Timeframe ActionRow ──────────────────────────────────────────

export function buildLeaderboardActionRow(activePeriod = 'weekly') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_view:weekly')
      .setLabel('Weekly')
      .setEmoji('⚡')
      .setStyle(activePeriod === 'weekly' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_view:monthly')
      .setLabel('Monthly')
      .setEmoji('📅')
      .setStyle(activePeriod === 'monthly' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lb_view:all_time')
      .setLabel('All-Time')
      .setEmoji('🏆')
      .setStyle(activePeriod === 'all_time' ? ButtonStyle.Secondary : ButtonStyle.Secondary)
  );
}

// ─── Unified Overall Community Engagement Leaderboard ─────────────────────────

export async function buildOverallLeaderboardEmbed(periodType = 'weekly') {
  const rows = await fetchEngagementLeaderboard(periodType, 10);

  let periodTitle = '⚡  Weekly Standings (Last 7 Days)';
  let themeColor  = 0x00C853; // HackerRank green
  let bannerNote  = 'Resets every Sunday at 9:00 PM IST';

  if (periodType === 'monthly') {
    periodTitle = '📅  Monthly Championship (Current Month)';
    themeColor  = 0xF1C40F; // Gold
    bannerNote  = 'Top 3 earn verified titles at month-end';
  } else if (periodType === 'all_time') {
    periodTitle = '🏆  All-Time Hall of Fame';
    themeColor  = 0x9B59B6; // Amethyst
    bannerNote  = 'Cumulative lifetime community contributions';
  }

  const embed = new EmbedBuilder()
    .setColor(themeColor)
    .setAuthor({
      name: 'HackerRank Campus Crew • Community Leaderboard',
      iconURL: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3c6.png',
    })
    .setTitle(periodTitle)
    .setThumbnail('https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3c6.png')
    .setFooter({
      text: `HCC AutoEngage • ${bannerNote}  │  Switch views with the buttons below`,
    })
    .setTimestamp();

  if (rows.length === 0) {
    embed.setDescription(
      `> Real-time rankings balancing **Learning**, **Discussions**, **Voice**, **Reactions**, and **Contributions**.\n${HR}\n\n` +
      `### 📭  No Activity Recorded Yet\n` +
      `Be the first to step onto the podium!\n\n` +
      `• Solve today's technical challenge with \`/quiz today\`\n` +
      `• Participate in technical discussions in server channels\n` +
      `• Join voice study sessions and help peers\n\n${HR}`
    );
    return embed;
  }

  const cards = rows.map((r) => {
    const mention = r.discord_id ? `<@${r.discord_id}>` : `**${r.username}**`;
    const scoreBar = modernBar(r.overall_score, 10);
    const badge = RANK_BADGES[r.rank];

    const breakdown = [
      `🧠 Learn **${Math.round(r.learning_score)}%**`,
      `💬 Chat **${Math.round(r.text_score)}%**`,
      `🎙️ Voice **${Math.round(r.voice_score)}%**`,
      `❤️ Support **${Math.round(r.reaction_score)}%**`,
      `🤝 Collab **${Math.round(r.contribution_score)}%**`,
    ].join('  •  ');

    if (badge) {
      // Top 3 Hero Cards
      return (
        `${badge.medal}  **#${r.rank}  ${mention}**  —  \`${r.overall_score} pts\`\n` +
        `> \`${scoreBar}\`  **${badge.title}**\n` +
        `-# ${breakdown}`
      );
    }

    // Standard Cards for #4 - #10
    return (
      `\`#${String(r.rank).padStart(2, '0')}\`  ${mention}  —  **${r.overall_score} pts**  \`${scoreBar}\`\n` +
      `-# ${breakdown}`
    );
  });

  embed.setDescription(
    `> Overall rankings balancing **Learning** (40%), **Discussions** (25%), **Voice** (15%), **Reactions** (10%), and **Contributions** (10%).\n${HR}\n\n` +
    cards.join('\n\n') +
    `\n\n${HR}\n` +
    `💡  **Whispers from the Mod:**\n` +
    `> ${getRandomLeaderboardTip()}\n\n` +
    `-# ⚖️ **Fair Scoring:** Scores are normalized against community benchmarks so learning and teamwork matter most.`
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
    isCurrentlyInVoice: false,
    activeVoiceMinutes: 0,
  };
  const member = summary?.member || {};

  const voiceStatusLine = s.isCurrentlyInVoice
    ? `• Status: 🟢 **Active Voice Session** (${s.activeVoiceMinutes}m in voice call)\n`
    : `• Status: ⚪ Disconnected\n`;

  const description = [
    `> **Activity Scorecard for** <@${discordUser.id}>`,
    `> Balanced across Learning, Discussions, Voice Study, Reactions & Peer Help.\n`,
    `${HR}\n`,
    `### 🧠  Learning & Quizzes (40% Weight)`,
    `• Quizzes: **${member.quizzes_completed || 0}** completed (${member.quizzes_won || 0} won)`,
    `• Level & XP: **${member.total_xp || 0}** Total XP  ·  **Level ${member.level || 1}**\n`,
    `### 💬  Text Discussions (25% Weight)`,
    `• Participation: **${s.textPoints}** pts earned  ·  **${s.messageCount}** messages sent\n`,
    `### 🎙️  Voice & Study (15% Weight)`,
    `• Connected Time: **${s.voicePoints}** pts earned  ·  **${s.voiceMinutes}** minutes`,
    voiceStatusLine,
    `### ❤️  Support & Reactions (10% Weight)`,
    `• Community Support: **${s.reactionPoints}** pts  ·  **${s.reactionCount}** reactions added\n`,
    `### 🤝  Contributions & Peer Thanks (10% Weight)`,
    `• Recognition: **${s.contributionPoints}** pts from peer thanks & awards\n`,
    `${HR}\n`,
    `🔥 **Daily Streak:** **${member.streak_current || 0} day${(member.streak_current || 0) !== 1 ? 's' : ''}**  ·  📅 **Active Days:** **${s.activeDays} / 30**`,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x00C853)
    .setAuthor({
      name: `${discordUser.username} — Community Engagement Scorecard`,
      iconURL: discordUser.displayAvatarURL({ size: 128 }),
    })
    .setTitle(`📊  30-Day Activity Breakdown`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .setDescription(description)
    .setFooter({
      text: 'HCC AutoEngage • Balanced scores reward learning, discussion & collaboration!',
    })
    .setTimestamp();

  return embed;
}
