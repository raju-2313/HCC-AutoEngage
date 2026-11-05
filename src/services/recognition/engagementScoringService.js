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

const HR = '┄'.repeat(32);

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
  };
  const member = summary?.member || {};

  const embed = new EmbedBuilder()
    .setColor(0x00C853)
    .setAuthor({
      name: 'HCC Community Engagement Profile',
      iconURL: discordUser.displayAvatarURL({ size: 128 }),
    })
    .setTitle(`📊  ${discordUser.username}'s 30-Day Activity Breakdown`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .setDescription(
      `> Activity scorecard for <@${discordUser.id}>\n${HR}`
    )
    .addFields(
      {
        name: '🧠  Learning & Quizzes (40%)',
        value: `**${member.quizzes_completed || 0}** quizzes completed\n**${member.total_xp || 0}** Total XP  ·  Level ${member.level || 1}`,
        inline: true,
      },
      {
        name: '💬  Text Participation (25%)',
        value: `**${s.textPoints}** points earned\n${s.messageCount} messages across channels`,
        inline: true,
      },
      {
        name: '🎙️  Voice & Study (15%)',
        value: `**${s.voicePoints}** points earned\n${s.voiceMinutes} connected minutes`,
        inline: true,
      },
      {
        name: '❤️  Support & Reactions (10%)',
        value: `**${s.reactionPoints}** points\n${s.reactionCount} reactions added`,
        inline: true,
      },
      {
        name: '🤝  Contributions (10%)',
        value: `**${s.contributionPoints}** points\nPeer thanks & moderator awards`,
        inline: true,
      },
      {
        name: '📅  Consistency & Streak',
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
