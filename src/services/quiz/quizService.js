/**
 * src/services/quiz/quizService.js
 * Daily quiz engine: publishing, interactive button construction,
 * instant answer verification, educational feedback, and duplicate prevention.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/embeds.js';
import {
  createQuiz,
  getActiveQuiz,
  publishQuiz,
  getQuizById,
} from '../../database/queries/quizzes.js';
import { upsertMember, getMemberByDiscordId } from '../../database/queries/members.js';
import { submitQuizAttempt, hasMemberAttempted } from '../../database/queries/attempts.js';
import { getDailyQuestion } from './questionBank.js';

/**
 * Builds the Discord Embed and ActionRow components for a quiz.
 */
export function buildQuizMessage(quiz, question) {
  const difficultyBadge =
    quiz.difficulty === 'advanced' ? '🔥 Advanced' : '🌱 Beginner';

  // Format options text in the embed body
  const optionsText = question.options
    .map((opt) => `**${opt.id})** ${opt.text}`)
    .join('\n\n');

  let description = `${question.questionText}\n\n`;
  if (question.code_snippet || question.codeSnippet) {
    const code = question.code_snippet || question.codeSnippet;
    description += `\`\`\`javascript\n${code}\n\`\`\`\n`;
  }
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${optionsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🧠 ${quiz.title}`)
    .setDescription(description)
    .addFields(
      { name: '🎯 Difficulty', value: difficultyBadge, inline: true },
      { name: '🎁 Reward', value: `+${quiz.points_reward} Pts / +${quiz.xp_reward} XP`, inline: true },
      { name: '⏱️ Duration', value: '3–5 Minutes', inline: true }
    )
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew | 1 attempt per member' })
    .setTimestamp();

  // 4 interactive option buttons: [ A ] [ B ] [ C ] [ D ]
  const buttons = question.options.map((opt) =>
    new ButtonBuilder()
      .setCustomId(`quiz_ans:${quiz.id}:${opt.id}`)
      .setLabel(`Option ${opt.id}`)
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder().addComponents(buttons);

  return { embeds: [embed], components: [row] };
}

/**
 * Publishes a quiz to a Discord channel and records it in Supabase.
 */
export async function publishDailyQuiz({ client, channelId, questionData = null, scheduledFor = null }) {
  const targetChannel = await client.channels.fetch(channelId).catch(() => null);
  if (!targetChannel) {
    throw new Error(`Target channel ${channelId} not found or inaccessible by the bot.`);
  }

  // Pick today's question if not explicitly provided
  const qData = questionData || getDailyQuestion();

  // 1. Create quiz and question in Supabase
  const createdQuiz = await createQuiz({
    title: qData.title,
    description: `Daily ${qData.difficulty} quiz on ${qData.category}`,
    category: qData.category,
    difficulty: qData.difficulty,
    pointsReward: qData.pointsReward,
    xpReward: qData.xpReward,
    scheduledFor: scheduledFor || new Date().toISOString().split('T')[0],
    createdBy: 'system',
    questions: [
      {
        questionText: qData.questionText,
        codeSnippet: qData.codeSnippet,
        options: qData.options,
        correctOption: qData.correctOption,
        explanation: qData.explanation,
      },
    ],
  });

  const question = createdQuiz.quiz_questions[0];

  // 2. Build message & send to Discord
  const messagePayload = buildQuizMessage(createdQuiz, question);
  const sentMessage = await targetChannel.send(messagePayload);

  // 3. Mark quiz active and link message ID
  const activeQuiz = await publishQuiz(createdQuiz.id, {
    messageId: sentMessage.id,
    channelId: targetChannel.id,
  });

  logger.info('Daily quiz published successfully', {
    quizId: activeQuiz.id,
    channelId: targetChannel.id,
    messageId: sentMessage.id,
  });

  return { quiz: activeQuiz, message: sentMessage };
}

/**
 * Handles button interactions when a member selects an answer button.
 */
export async function handleQuizAnswerInteraction(interaction) {
  // customId shape: quiz_ans:<quizId>:<selectedOption>
  const parts = interaction.customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'quiz_ans') return;

  const [, quizId, selectedOption] = parts;
  const discordUser = interaction.user;

  // Defer reply ephemerally so answers/feedback stay completely private
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Ensure member profile exists in members table
    const member = await upsertMember({
      discordId: discordUser.id,
      username: discordUser.username,
      avatarUrl: discordUser.displayAvatarURL(),
    });

    // 2. Perform duplicate check early for fast feedback
    const alreadyAnswered = await hasMemberAttempted(quizId, member.id);
    if (alreadyAnswered) {
      const duplicateEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('⚠️ Quiz Already Submitted')
        .setDescription(
          'You have already submitted an answer for this quiz!\n\n' +
          'To ensure fair leaderboards, only **one submission** is permitted per member.'
        )
        .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' });

      return interaction.editReply({ embeds: [duplicateEmbed] });
    }

    // 3. Submit attempt atomically via PostgreSQL RPC
    const result = await submitQuizAttempt({
      quizId,
      discordId: discordUser.id,
      selectedOption,
    });

    if (!result) {
      throw new Error('No result returned from quiz submission procedure.');
    }

    // Fetch updated member for fresh streak/points info
    const updatedMember = await getMemberByDiscordId(discordUser.id);

    // 4. Build instant educational feedback embed
    const isCorrect = result.is_correct;
    const title = isCorrect ? '🎉 Correct Answer!' : '❌ Incorrect Answer';
    const color = isCorrect ? COLORS.success : COLORS.error;

    const feedbackEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `**Your Selection:** Option **${selectedOption}**\n` +
        `**Correct Answer:** Option **${result.correct_option}**\n\n` +
        `**💡 Educational Explanation:**\n${result.explanation}`
      )
      .addFields(
        {
          name: '🎁 Points Awarded',
          value: `**+${result.points_awarded} Points**`,
          inline: true,
        },
        {
          name: '⭐ XP Gained',
          value: `**+${result.xp_awarded} XP**`,
          inline: true,
        },
        {
          name: '🔥 Current Streak',
          value: `**${updatedMember?.streak_current || 1} Days**`,
          inline: true,
        }
      )
      .setFooter({ text: 'HCC AutoEngage • Feedback is private to you' })
      .setTimestamp();

    await interaction.editReply({ embeds: [feedbackEmbed] });

    logger.info('Quiz answer processed', {
      user: discordUser.tag,
      quizId,
      selectedOption,
      isCorrect,
    });
  } catch (err) {
    if (err.message === 'DUPLICATE_ATTEMPT') {
      const duplicateEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('⚠️ Quiz Already Submitted')
        .setDescription('You have already submitted an answer for this quiz! Only one attempt is allowed.');
      return interaction.editReply({ embeds: [duplicateEmbed] });
    }

    logger.error('Error handling quiz answer interaction', {
      user: discordUser.tag,
      quizId,
      error: err.message,
    });

    await interaction.editReply({
      content: '❌ An error occurred while submitting your answer. Please try again.',
    });
  }
}
