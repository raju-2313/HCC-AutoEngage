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
  MessageFlags,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/embeds.js';
import {
  createQuiz,
  getActiveQuiz,
  publishQuiz,
  getQuizById,
  getQuizByScheduledDate,
} from '../../database/queries/quizzes.js';
import { upsertMember, getMemberByDiscordId, recordDailyParticipation } from '../../database/queries/members.js';
import { submitQuizAttempt, hasMemberAttempted } from '../../database/queries/attempts.js';
import { getDailyQuestion, getKolkataDateString } from './questionBank.js';

// ─── Visual constants ────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  javascript:   '🟨',
  python:       '🐍',
  dsa:          '🌳',
  databases:    '🗄️',
  git:          '🔀',
  web:          '🌐',
  http:         '🌐',
  systems:      '⚙️',
  default:      '💡',
};

const DIFFICULTY_CONFIG = {
  beginner: { label: '🌱 Beginner', bar: '█░░░░', color: COLORS.success },
  advanced: { label: '🔥 Advanced', bar: '█████', color: COLORS.warning },
};

const OPTION_STYLES = {
  A: { emoji: '🅰️', style: ButtonStyle.Primary },
  B: { emoji: '🅱️', style: ButtonStyle.Primary },
  C: { emoji: '🇨',  style: ButtonStyle.Primary },
  D: { emoji: '🇩',  style: ButtonStyle.Primary },
};

/** Returns the category icon for a quiz category string. */
function categoryIcon(category = '') {
  return CATEGORY_ICONS[category.toLowerCase()] ?? CATEGORY_ICONS.default;
}

/** Thin horizontal rule that works in Discord embeds. */
const HR = '┄'.repeat(28);

// ─── Quiz embed builder ───────────────────────────────────────────────────────

/**
 * Builds the Discord Embed and ActionRow components for a quiz.
 * Supports both snake_case (DB) and camelCase (in-memory) question shapes.
 */
export function buildQuizMessage(quiz, question) {
  // Support both snake_case (DB) and camelCase (memory)
  const questionText  = question.question_text || question.questionText || '';
  const codeSnippet   = question.code_snippet  || question.codeSnippet;
  const points        = quiz.points_reward ?? quiz.pointsReward ?? 10;
  const xp            = quiz.xp_reward     ?? quiz.xpReward     ?? 20;
  const category      = quiz.category      ?? 'general';
  const difficulty    = quiz.difficulty    ?? 'beginner';
  const diff          = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.beginner;
  const catIcon       = categoryIcon(category);

  // ── Options block with clean layout ─────────────────────────────────────────
  const optionsText = (question.options || [])
    .map((opt) => {
      const cfg = OPTION_STYLES[opt.id] ?? { emoji: opt.id };
      return `${cfg.emoji}  **${opt.id}.**  ${opt.text}`;
    })
    .join('\n\n');

  // ── Description assembly ────────────────────────────────────────────────────
  let description = `### ${questionText}\n`;
  if (codeSnippet) {
    const lang = category === 'c' ? 'c' : category === 'python' ? 'python' : category === 'web' ? 'html' : 'javascript';
    description += `\n\`\`\`${lang}\n${codeSnippet}\n\`\`\`\n`;
  }
  description += `\n${HR}\n\n${optionsText}\n\n${HR}`;

  // ── Embed ───────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(diff.color)
    .setTitle(`${catIcon}  ${quiz.title}`)
    .setDescription(description)
    .addFields(
      { name: '🎯 Difficulty',   value: `${diff.label}\n\`${diff.bar}\``,       inline: true },
      { name: '🎁 Reward',       value: `**+${points}** Pts\n**+${xp}** XP`,    inline: true },
      { name: '📌 Category',     value: `${catIcon} ${category.toUpperCase()}`,  inline: true }
    )
    .setFooter({
      text: `HCC AutoEngage • HackerRank Campus Crew  │  1 attempt per member  │  Today at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    })
    .setTimestamp();

  // ── Buttons with emoji + label ───────────────────────────────────────────────
  const buttons = (question.options || []).map((opt) => {
    const cfg = OPTION_STYLES[opt.id] ?? { emoji: '', style: ButtonStyle.Primary };
    return new ButtonBuilder()
      .setCustomId(`quiz_ans:${quiz.id}:${opt.id}`)
      .setLabel(`Option ${opt.id}`)
      .setEmoji(cfg.emoji)
      .setStyle(cfg.style);
  });

  const row = new ActionRowBuilder().addComponents(buttons);
  return { embeds: [embed], components: [row] };
}

// ─── Publish daily quiz ───────────────────────────────────────────────────────

/**
 * Publishes a quiz to a Discord channel and records it in Supabase.
 */
export async function publishDailyQuiz({
  client,
  channelId,
  questionData = null,
  scheduledFor = null,
  allowDuplicateForDate = false,
  suppressEveryonePing = true,
}) {
  const targetChannel = await client.channels.fetch(channelId).catch(() => null);
  if (!targetChannel) {
    throw new Error(`Target channel ${channelId} not found or inaccessible by the bot.`);
  }

  const targetDate = scheduledFor || getKolkataDateString();

  // Duplicate protection: prevent posting multiple daily quizzes for the same date
  if (!allowDuplicateForDate) {
    const existing = await getQuizByScheduledDate(targetDate);
    if (existing && (existing.status === 'active' || existing.status === 'closed')) {
      logger.warn('Daily quiz already exists for scheduled date. Skipping duplicate post.', {
        date: targetDate,
        existingQuizId: existing.id,
        status: existing.status,
      });
      return { quiz: existing, alreadyExisted: true };
    }
  }

  const qData = questionData || getDailyQuestion(targetDate);

  const createdQuiz = await createQuiz({
    title: qData.title,
    description: `Daily ${qData.difficulty} quiz on ${qData.category}`,
    category: qData.category,
    difficulty: qData.difficulty,
    pointsReward: qData.pointsReward,
    xpReward: qData.xpReward,
    scheduledFor: targetDate,
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
  const messagePayload = buildQuizMessage(createdQuiz, question);
  const mentionContent = suppressEveryonePing
    ? '🔔 **Today\'s Daily Tech Challenge is Live!** 🧠\nTest your knowledge, keep your daily streak burning, and climb the leaderboard:'
    : '🔔 **@everyone — Today\'s Daily Tech Challenge is Live!** 🧠\nTest your knowledge, keep your daily streak burning, and climb the leaderboard:';

  const sentMessage = await targetChannel.send({
    content: mentionContent,
    ...messagePayload,
    allowedMentions: suppressEveryonePing ? { parse: [] } : { parse: ['everyone'] },
  });

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

// ─── Answer interaction handler ───────────────────────────────────────────────

/**
 * Handles button interactions when a member selects an answer button.
 */
export async function handleQuizAnswerInteraction(interaction) {
  const parts = interaction.customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'quiz_ans') return;

  const [, quizId, selectedOption] = parts;
  const discordUser = interaction.user;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // 1. Ensure member profile exists
    const member = await upsertMember({
      discordId: discordUser.id,
      username: discordUser.username,
      avatarUrl: discordUser.displayAvatarURL(),
    });

    // 2. Duplicate-check
    const alreadyAnswered = await hasMemberAttempted(quizId, member.id);
    if (alreadyAnswered) {
      const duplicateEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('⚠️  Already Submitted')
        .setDescription(
          '> You\'ve already locked in your answer for this quiz!\n\n' +
          '**Fair Play Policy**\n' +
          'Each member gets exactly **one attempt** per quiz to keep the leaderboard fair.\n\n' +
          '_Use `/quiz stats` to see your submission history._'
        )
        .setFooter({ text: 'HCC AutoEngage • One attempt per member' });

      return interaction.editReply({ embeds: [duplicateEmbed] });
    }

    // 3. Submit attempt atomically via PostgreSQL RPC
    const result = await submitQuizAttempt({ quizId, discordId: discordUser.id, selectedOption });

    if (!result) {
      throw new Error('No result returned from quiz submission procedure.');
    }

    // 4. Update and normalize calendar-based daily streak
    const updatedMember = await recordDailyParticipation(discordUser.id, 'quiz_attempt') || await getMemberByDiscordId(discordUser.id);

    // 5. Build rich feedback embed
    const isCorrect = result.is_correct;
    const color     = isCorrect ? COLORS.success : COLORS.error;

    // Streak fire string
    const streak = updatedMember?.streak_current ?? 1;
    const streakFire = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥';

    // Result banner
    const banner = isCorrect
      ? `## 🎉  Nailed it, <@${discordUser.id}>!`
      : `## ❌  Not quite, <@${discordUser.id}>`;

    // Answer comparison block
    const yourIcon    = isCorrect ? '✅' : '❌';
    const correctIcon = '✅';
    const answerBlock =
      `${yourIcon}  **Your Answer:** Option **${selectedOption}**\n` +
      `${correctIcon}  **Correct Answer:** Option **${result.correct_option}**`;

    // Explanation block
    const explanationBlock =
      `### 💡 Explanation\n${result.explanation}`;

    const description = [banner, '', answerBlock, '', HR, '', explanationBlock].join('\n');

    const feedbackEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(description)
      .addFields(
        {
          name: '🎁 Points',
          value: result.points_awarded > 0
            ? `**+${result.points_awarded}** pts`
            : '`+0` pts',
          inline: true,
        },
        {
          name: '⭐ XP',
          value: result.xp_awarded > 0
            ? `**+${result.xp_awarded}** XP`
            : '`+0` XP',
          inline: true,
        },
        {
          name: `${streakFire} Streak`,
          value: `**${streak}** day${streak !== 1 ? 's' : ''}`,
          inline: true,
        }
      )
      .setThumbnail(
        isCorrect
          ? 'https://em-content.zobj.net/source/twitter/376/trophy_1f3c6.png'
          : 'https://em-content.zobj.net/source/twitter/376/books_1f4da.png'
      )
      .setFooter({ text: 'HCC AutoEngage • Answer is private to you  │  Use /profile to see your stats' })
      .setTimestamp();

    await interaction.editReply({ embeds: [feedbackEmbed] });

    logger.info('Quiz answer processed', {
      user: discordUser.username,
      quizId,
      selectedOption,
      isCorrect,
    });

  } catch (err) {
    if (err.message === 'DUPLICATE_ATTEMPT') {
      const duplicateEmbed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('⚠️  Already Submitted')
        .setDescription('You have already submitted an answer for this quiz! Only one attempt is allowed.');
      return interaction.editReply({ embeds: [duplicateEmbed] });
    }

    logger.error('Error handling quiz answer interaction', {
      user: discordUser.username,
      quizId,
      error: err.message,
    });

    await interaction.editReply({
      content: '❌ An error occurred while submitting your answer. Please try again.',
    });
  }
}
