/**
 * src/services/recognition/weeklyAnnouncementService.js
 * Generates and broadcasts the official Weekly Community Engagement Digest & Honors.
 */

import { EmbedBuilder } from 'discord.js';
import { fetchEngagementLeaderboard } from '../../database/queries/engagement.js';
import { getServerMemberStats } from '../../database/queries/members.js';
import { takeLeaderboardSnapshot } from './leaderboardService.js';
import { logActivity } from '../../database/queries/logs.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

const HR = '───────────────────────';

const MEDALS = {
  1: { emoji: '🥇', label: 'WEEKLY CHAMPION', color: 0xF1C40F, title: 'Grand Champion 👑' },
  2: { emoji: '🥈', label: 'RUNNER-UP', color: 0xC0C0C0, title: 'Silver Contender ⚡' },
  3: { emoji: '🥉', label: 'THIRD PLACE', color: 0xCD7F32, title: 'Bronze Achiever 🌟' },
};

function modernBar(score, total = 8) {
  const filled = Math.max(0, Math.min(total, Math.round((score / 100) * total)));
  return '▰'.repeat(filled) + '▱'.repeat(total - filled);
}

/**
 * Builds the comprehensive weekly celebration embeds.
 */
export async function buildWeeklyDigestEmbeds() {
  const leaders = await fetchEngagementLeaderboard('weekly', 10);
  const serverStats = await getServerMemberStats();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Embed 1: 🏆 Weekly Honors & Podium ─────────────────────────────────────
  const podiumEmbed = new EmbedBuilder()
    .setColor(0x00C853) // HackerRank Green
    .setAuthor({
      name: 'HackerRank Campus Crew • Weekly Community Honors',
      iconURL: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3c6.png',
    })
    .setTitle(`🏆  Weekly Community Engagement Awards • ${dateStr}`)
    .setThumbnail('https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3c6.png')
    .setFooter({ text: 'HCC AutoEngage • Weekly Standings reset every Sunday at 9:00 PM IST' })
    .setTimestamp();

  if (leaders.length === 0) {
    podiumEmbed.setDescription(
      `> Celebrating our top students across **Learning**, **Discussions**, **Voice Study**, and **Peer Collaboration**.\n${HR}\n\n` +
      `### 📭  No Weekly Activity Recorded\n` +
      `A brand new week has started! Solve daily quizzes and join channel discussions to take the lead next Sunday!\n\n${HR}`
    );
  } else {
    const leaderLines = leaders.map((r) => {
      const mention = r.discord_id ? `<@${r.discord_id}>` : `**${r.username}**`;
      const bar = modernBar(r.overall_score, 8);
      const medalInfo = MEDALS[r.rank];

      const breakdown = [
        `🧠 Learn **${Math.round(r.learning_score)}%**`,
        `💬 Chat **${Math.round(r.text_score)}%**`,
        `🎙️ Voice **${Math.round(r.voice_score)}%**`,
        `❤️ Support **${Math.round(r.reaction_score)}%**`,
        `🤝 Collab **${Math.round(r.contribution_score)}%**`,
      ].join('  •  ');

      if (medalInfo) {
        return (
          `${medalInfo.emoji}  **#${r.rank}  ${mention}**  —  \`${r.overall_score} pts\`\n` +
          `> \`${bar}\`  **${medalInfo.title}**\n` +
          `-# ${breakdown}`
        );
      }

      return (
        `\`#${String(r.rank).padStart(2, '0')}\`  ${mention}  —  **${r.overall_score} pts**  \`${bar}\`\n` +
        `-# ${breakdown}`
      );
    });

    podiumEmbed.setDescription(
      `> Congratulations to our top students for exceptional participation across **Learning**, **Discussions**, **Voice Study**, and **Collaboration**!\n${HR}\n\n` +
      leaderLines.join('\n\n') +
      `\n\n${HR}\n` +
      `-# ⚖️ *Scores are normalized across all categories so daily learning and helpful discussions carry real impact.*`
    );
  }

  // ── Embed 2: 📊 Community Impact & Next Week Outlook ──────────────────────
  const statsEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📊  Community Impact & Highlights')
    .setDescription(
      `> HackerRank Campus Crew activity metrics for this week\n${HR}`
    )
    .addFields(
      {
        name: '👥  Active Members',
        value: `**${serverStats.totalMembers}** registered`,
        inline: true,
      },
      {
        name: '🔥  Active Streaks',
        value: `**${serverStats.activeStreaks}** members on fire`,
        inline: true,
      },
      {
        name: '📚  Quizzes Completed',
        value: `**${serverStats.totalAttempts}** challenges solved`,
        inline: true,
      },
      {
        name: '💰  Points Circulating',
        value: `**${serverStats.totalPoints}** total points`,
        inline: true,
      },
      {
        name: '⭐  Total XP Earned',
        value: `**${serverStats.totalXP}** cumulative XP`,
        inline: true,
      },
      {
        name: '🚀  Next Week\'s Target',
        value: `Daily quizzes drop at **09:00 AM IST**`,
        inline: true,
      }
    )
    .setFooter({ text: 'HCC AutoEngage • Consistency, collaboration, and learning' });

  return [podiumEmbed, statsEmbed];
}

/**
 * Broadcasts the weekly announcement package to Discord.
 */
export async function postWeeklyAnnouncement({ client, channelId = null }) {
  const targetId = channelId
    || config.discord.channels.announcements
    || config.discord.channels.leaderboard
    || config.discord.channels.quiz;

  if (!targetId) {
    throw new Error('No target channel configured for weekly announcements.');
  }

  const channel = await client.channels.fetch(targetId).catch(() => null);
  if (!channel) {
    throw new Error(`Target channel ${targetId} could not be accessed by the bot.`);
  }

  const embeds = await buildWeeklyDigestEmbeds();

  await channel.send({
    content: '📢 **@everyone — The HCC Weekly Community Roundup & Standings are live!** 🎉\nCheck out our top contributors and weekly champions below:',
    embeds,
  });

  // Save immutable snapshot to DB
  await takeLeaderboardSnapshot('weekly');

  await logActivity('weekly_community_announcement_broadcast', 'system', {
    channelId: targetId,
  });

  logger.info('Weekly Community Announcement successfully published', { channelId: targetId });
  return { success: true, channelId: targetId };
}

