/**
 * src/commands/quiz.js
 * Slash commands for members: /quiz today, /quiz stats
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getActiveQuiz } from '../database/queries/quizzes.js';
import { getMemberByDiscordId } from '../database/queries/members.js';
import { getMemberQuizAttempts } from '../database/queries/attempts.js';
import { buildQuizMessage } from '../services/quiz/quizService.js';
import { COLORS, errorEmbed, infoEmbed } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('quiz')
  .setDescription('HCC AutoEngage daily quizzes and personal statistics.')
  .addSubcommand((sub) =>
    sub
      .setName('today')
      .setDescription('View and interact with today’s active quiz.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View your quiz participation, win rate, and current streak.')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // ── Subcommand: /quiz today ─────────────────────────────────────────────────
  if (subcommand === 'today') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const activeQuiz = await getActiveQuiz();
    if (!activeQuiz || !activeQuiz.quiz_questions || activeQuiz.quiz_questions.length === 0) {
      return interaction.editReply({
        embeds: [
          infoEmbed(
            'No Active Quiz',
            'There is currently no active daily quiz posted.\nDaily quizzes drop every morning at **09:00 AM**! Check back soon.'
          ),
        ],
      });
    }

    const question = activeQuiz.quiz_questions[0];
    const messagePayload = buildQuizMessage(activeQuiz, question);

    return interaction.editReply({
      content: 'Here is today’s active quiz challenge! Click an option below to submit your answer:',
      embeds: messagePayload.embeds,
      components: messagePayload.components,
    });
  }

  // ── Subcommand: /quiz stats ─────────────────────────────────────────────────
  if (subcommand === 'stats') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await getMemberByDiscordId(interaction.user.id);
    if (!member || member.quizzes_completed === 0) {
      return interaction.editReply({
        embeds: [
          infoEmbed(
            'No Quiz History Yet',
            'You haven’t completed any quizzes yet!\nUse `/quiz today` to take your first quiz and start building your streak.'
          ),
        ],
      });
    }

    const completed = member.quizzes_completed;
    const won = member.quizzes_won;
    const winRate = completed > 0 ? Math.round((won / completed) * 100) : 0;
    const recentAttempts = await getMemberQuizAttempts(interaction.user.id, 5);

    const statsEmbed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`📊 Quiz Statistics • ${interaction.user.username}`)
      .setDescription('Here is your personal HackerRank Campus Crew quiz performance summary:')
      .addFields(
        { name: '📝 Completed', value: `${completed} Quizzes`, inline: true },
        { name: '🎯 Accuracy', value: `${won}/${completed} (${winRate}%)`, inline: true },
        { name: '🔥 Current Streak', value: `${member.streak_current} Days`, inline: true },
        { name: '⚡ Best Streak', value: `${member.streak_max} Days`, inline: true },
        { name: '🏆 Total Points', value: `${member.total_points} Pts`, inline: true },
        { name: '⭐ Level & XP', value: `Level ${member.level} (${member.total_xp} XP)`, inline: true }
      )
      .setFooter({ text: 'HCC AutoEngage • Keep your daily streak alive!' })
      .setTimestamp();

    if (recentAttempts.length > 0) {
      const historyLines = recentAttempts
        .map((att) => {
          const icon = att.is_correct ? '✅' : '❌';
          const quizTitle = att.quizzes?.title || 'Daily Quiz';
          const points = att.points_awarded > 0 ? `+${att.points_awarded} pts` : '+0 pts';
          return `${icon} **${quizTitle}** — ${points} (+${att.xp_awarded} XP)`;
        })
        .join('\n');

      statsEmbed.addFields({
        name: '🕒 Recent Submissions',
        value: historyLines,
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [statsEmbed] });
  }
}

