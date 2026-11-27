/**
 * src/services/learning/gitLearningManager.js
 * Core engine for HCC Git & GitHub 15-Day Learning Programme.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import {
  upsertLearningProgress,
  getMemberLearningProgress,
  getDayLearningStats,
} from '../../database/queries/gitLearning.js';
import { upsertMember, updateMemberPoints } from '../../database/queries/members.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..', '..');
const CONTENT_DIR = join(ROOT_DIR, 'learning-content', 'git-github');

const BRAND_GREEN = 0x00C853; // HackerRank green
const HR = '───────────────────────────────────────';

/**
 * Calculates current programme day (1–15) based on a starting date string (YYYY-MM-DD).
 * Defaults to GIT_PROGRAMME_START_DATE from env.
 * Returns null if today is before the start date or past day 15.
 */
export function calculateProgrammeDay(startDateStr = process.env.GIT_PROGRAMME_START_DATE) {
  if (!startDateStr) return null;

  try {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const [tY, tM, tD] = todayStr.split('-').map(Number);

    const startUtc = Date.UTC(sY, sM - 1, sD);
    const todayUtc = Date.UTC(tY, tM - 1, tD);

    const diffDays = Math.floor((todayUtc - startUtc) / (1000 * 60 * 60 * 24));
    const dayNumber = diffDays + 1;

    if (dayNumber >= 1 && dayNumber <= 15) {
      return dayNumber;
    }
    return null;
  } catch (err) {
    logger.warn('Failed to calculate programme day from start date', { startDateStr, error: err.message });
    return null;
  }
}

/**
 * Loads the complete content package for a specific programme day (1–15).
 */
export function getGitDayPackage(dayNumber) {
  const dayStr = String(dayNumber).padStart(2, '0');
  const dayDir = join(CONTENT_DIR, `day-${dayStr}`);

  if (!existsSync(dayDir)) {
    throw new Error(`Content package not found for programme Day ${dayNumber} at ${dayDir}`);
  }

  const loadJson = (filename) => {
    const p = join(dayDir, filename);
    return JSON.parse(readFileSync(p, 'utf-8'));
  };

  return {
    dayNumber,
    topic: loadJson('topic.json'),
    visualResources: loadJson('visual-resources.json'),
    readingResources: loadJson('reading-resources.json'),
    learningObjectives: loadJson('learning-objectives.json'),
    practicalTask: loadJson('practical-task.json'),
    quiz: loadJson('quiz.json'),
    explanations: loadJson('explanations.json'),
  };
}

/**
 * Builds the morning announcement message payload with Discord components.
 */
export function buildMorningAnnouncementPayload(dayNumber) {
  const pkg = getGitDayPackage(dayNumber);
  const { topic, visualResources, readingResources, learningObjectives, practicalTask } = pkg;
  const dayPad = String(dayNumber).padStart(2, '0');

  // Objectives formatted
  const objectivesText = learningObjectives.map((obj) => `• ${obj}`).join('\n');

  // Visual list
  const visualText = visualResources
    .map((v) => `🎬 **[${v.title}](${v.url})**\n> 👤 *${v.creator}* · ⏱️ ~${v.duration_minutes} mins · 💡 ${v.what_you_learn}`)
    .join('\n\n');

  // Reading list
  const readingText = readingResources
    .map((r) => `📖 **[${r.title}](${r.url})**\n> 🏛️ *${r.publisher}* · ⏱️ ~${r.est_read_time_minutes} mins read · 💡 ${r.what_you_learn}`)
    .join('\n\n');

  // Practical Task steps
  const taskStepsText = practicalTask.steps.slice(0, 5).map((step, idx) => `**${idx + 1}.** ${step}`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(BRAND_GREEN)
    .setTitle(`🟩  HCC DAILY LEARNING  |  DAY ${dayPad} OF 15`)
    .setDescription(
      `## 📌  **${topic.title}**\n\n` +
      `${topic.introduction}\n\n` +
      `💡 **Why it matters:** ${topic.why_it_matters}\n\n` +
      `${HR}\n\n` +
      `### 🎯  **LEARNING OBJECTIVES**\n${objectivesText}\n\n` +
      `${HR}\n\n` +
      `### 🎬  **TRACK A: VISUAL LEARNING**\n${visualText}\n\n` +
      `${HR}\n\n` +
      `### 📚  **TRACK B: READ & UNDERSTAND**\n${readingText}\n\n` +
      `${HR}\n\n` +
      `### 🛠️  **TODAY'S PRACTICAL TASK: ${practicalTask.title}**\n${taskStepsText}\n\n` +
      `> 🎯 **Expected:** ${practicalTask.expected_output}\n\n` +
      `${HR}\n\n` +
      `⏰ **Quiz Tonight:** 10 questions at **07:00 PM IST** (15s per Q) · **+10 pts / +20 XP** on the leaderboard!`
    )
    .addFields(
      { name: '⏱️ Study Time', value: `~${topic.estimated_time_minutes} mins`, inline: true },
      { name: '📊 Difficulty', value: topic.difficulty.toUpperCase(), inline: true },
      { name: '🏆 Leaderboard', value: '+10 pts / +20 XP per Q', inline: true }
    )
    .setFooter({
      text: `HCC Git & GitHub Programme • Day ${dayNumber}/15 • Self-report your progress below!`,
    })
    .setTimestamp();

  // Components: Row 1 = External Resource Link Buttons (up to 5 buttons max per row)
  const resourceButtons = [];
  if (visualResources[0]?.url) {
    resourceButtons.push(
      new ButtonBuilder()
        .setLabel(`Watch: ${visualResources[0].creator.slice(0, 20)}`)
        .setStyle(ButtonStyle.Link)
        .setURL(visualResources[0].url)
        .setEmoji('🎬')
    );
  }
  if (readingResources[0]?.url) {
    resourceButtons.push(
      new ButtonBuilder()
        .setLabel(`Read: ${readingResources[0].publisher.slice(0, 20)}`)
        .setStyle(ButtonStyle.Link)
        .setURL(readingResources[0].url)
        .setEmoji('📖')
    );
  }
  if (visualResources[1]?.url && resourceButtons.length < 5) {
    resourceButtons.push(
      new ButtonBuilder()
        .setLabel(`Watch Pt 2`)
        .setStyle(ButtonStyle.Link)
        .setURL(visualResources[1].url)
        .setEmoji('▶️')
    );
  }

  // Row 2 = Member status tracking buttons
  const statusRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gitlearn:status:${dayNumber}:in_progress`)
      .setLabel('In Progress')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🟡'),
    new ButtonBuilder()
      .setCustomId(`gitlearn:status:${dayNumber}:completed`)
      .setLabel('Completed')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🟢'),
    new ButtonBuilder()
      .setCustomId(`gitlearn:status:${dayNumber}:need_help`)
      .setLabel('Need Help')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❓'),
    new ButtonBuilder()
      .setCustomId(`gitlearn:task:${dayNumber}`)
      .setLabel('Task Done')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✅')
  );

  const components = [];
  if (resourceButtons.length > 0) {
    components.push(new ActionRowBuilder().addComponents(...resourceButtons));
  }
  components.push(statusRow);

  return {
    content: `📢 **@everyone — Day ${dayPad} of our 15-Day Git & GitHub Learning Programme is live!** 🚀\nExplore today's resources and test your knowledge tonight:`,
    embeds: [embed],
    components,
  };
}

/**
 * Builds the member's personal 15-day progress checklist embed for /learning progress.
 */
export async function buildPersonalProgressEmbed(member, discordId) {
  const records = await getMemberLearningProgress(discordId);
  const recordMap = new Map(records.map((r) => [r.programme_day, r]));

  let completedDaysCount = 0;
  let tasksDoneCount = 0;
  let totalQuizScore = 0;

  const rows = [];
  for (let d = 1; d <= 15; d++) {
    const r = recordMap.get(d);
    let statusIcon = '⚪';
    let taskIcon = '⬜';
    let quizText = '—';

    if (r) {
      if (r.learning_status === 'completed') {
        statusIcon = '🟢';
        completedDaysCount++;
      } else if (r.learning_status === 'in_progress') {
        statusIcon = '🟡';
      } else if (r.learning_status === 'need_help') {
        statusIcon = '❓';
      }

      if (r.practical_task_done) {
        taskIcon = '✅';
        tasksDoneCount++;
      }

      if (r.quiz_attempted) {
        quizText = `${r.quiz_score} pts`;
        totalQuizScore += r.quiz_score;
      }
    }

    try {
      const pkg = getGitDayPackage(d);
      const shortTitle = pkg.topic.title.length > 25 ? pkg.topic.title.slice(0, 23) + '…' : pkg.topic.title;
      rows.push(`\`Day ${String(d).padStart(2, '0')}\` ${statusIcon} Task: ${taskIcon} · Quiz: \`${quizText}\` · *${shortTitle}*`);
    } catch {
      rows.push(`\`Day ${String(d).padStart(2, '0')}\` ${statusIcon} Task: ${taskIcon} · Quiz: \`${quizText}\``);
    }
  }

  const completionPct = Math.round((completedDaysCount / 15) * 100);

  const embed = new EmbedBuilder()
    .setColor(BRAND_GREEN)
    .setTitle(`🎓  Git & GitHub Programme: Progress Tracker`)
    .setDescription(
      `Track your 15-day learning journey, practical task submissions, and evening quiz results.\n\n` +
      `**Legend:** 🟢 Completed · 🟡 In Progress · ❓ Need Help · ⚪ Not Started · ✅ Task Done\n\n` +
      `${HR}\n\n` +
      rows.join('\n') +
      `\n\n${HR}\n\n` +
      `> 🏆 *All quiz points and XP directly feed your standing on the community \`/leaderboard\`!*`
    )
    .addFields(
      { name: '📚 Days Completed', value: `**${completedDaysCount} / 15** (${completionPct}%)`, inline: true },
      { name: '🛠️ Practical Tasks', value: `**${tasksDoneCount} / 15**`, inline: true },
      { name: '🏆 Quiz Points', value: `**${totalQuizScore} pts**`, inline: true }
    )
    .setFooter({
      text: `Member: ${member?.username || discordId} • Keep up the daily streak!`,
    })
    .setTimestamp();

  return embed;
}

/**
 * Transforms a day's quiz.json into the question bank structure expected by dailyTimedSessionEngine.
 */
export function getGitProgrammeQuestionBank(dayNumber) {
  const pkg = getGitDayPackage(dayNumber);
  const { topic, quiz } = pkg;

  const formattedQuestions = quiz.questions.map((q) => ({
    id: q.id,
    topic: `Git: ${topic.title}`,
    difficulty: q.difficulty === 'beginner' ? 'easy' : 'medium',
    questionText: q.question,
    codeSnippet: q.codeSnippet || null,
    options: [
      { id: 'A', text: q.options.A },
      { id: 'B', text: q.options.B },
      { id: 'C', text: q.options.C },
      { id: 'D', text: q.options.D },
    ],
    correctOption: q.correctAnswer,
    explanation: q.explanation,
    pointsReward: q.points || 10,
    xpReward: q.xp || 20,
    timeLimitSeconds: quiz.meta.questionTimeSec || 15,
  }));

  return {
    meta: {
      dayNumber,
      topic: topic.title,
      category: 'git',
      totalQuestions: formattedQuestions.length,
      questionTimeSec: 15,
      dateLabel: `Day ${dayNumber} of 15: ${topic.title}`,
      startTime: '07:00 PM IST',
      isGitProgramme: true,
    },
    questions: formattedQuestions,
  };
}

/**
 * Handles student self-reporting button clicks (In Progress, Completed, Need Help).
 */
export async function handleGitLearningStatusInteraction(interaction) {
  // Format: gitlearn:status:<day>:<status>
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const dayNumber = parseInt(parts[2], 10);
  const status = parts[3];
  const user = interaction.user;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await upsertMember({
      discordId: user.id,
      username: user.username,
      avatarUrl: user.displayAvatarURL(),
    });

    await upsertLearningProgress({
      discordId: user.id,
      programmeDay: dayNumber,
      learningStatus: status,
    });

    let title = 'Learning Status Updated';
    let msg = '';
    let color = BRAND_GREEN;

    if (status === 'in_progress') {
      title = '🟡 In Progress';
      msg = `You've marked **Day ${dayNumber}** as in progress!\nTake your time with the curated visual & reading resources. Don't forget to practice the hands-on task!`;
      color = 0xF1C40F;
    } else if (status === 'completed') {
      title = '🟢 Study Material Completed!';
      msg = `Fantastic job completing **Day ${dayNumber}** study material!\nGet ready for the evening quiz at **07:00 PM IST** to test your knowledge and climb the leaderboard!`;
      color = BRAND_GREEN;
    } else if (status === 'need_help') {
      title = '❓ Help Request Recorded';
      msg = `No worries at all! Git concepts can feel abstract at first.\nAsk any question in <#1538470672722952303> or reach out to our mentors. We're here to learn together!`;
      color = 0xE74C3C;
    }

    const replyEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(msg)
      .setFooter({ text: 'Use `/learning progress` to view your 15-day checklist anytime.' });

    await interaction.editReply({ embeds: [replyEmbed] });
  } catch (err) {
    logger.error('Error handling git learning status interaction', { error: err.message, dayNumber, status });
    await interaction.editReply({
      content: 'Could not record your learning status right now. Please try again later.',
    });
  }
}

/**
 * Handles practical task completion button click.
 */
export async function handleGitLearningTaskInteraction(interaction) {
  // Format: gitlearn:task:<day>
  const parts = interaction.customId.split(':');
  if (parts.length !== 3) return;

  const dayNumber = parseInt(parts[2], 10);
  const user = interaction.user;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const member = await upsertMember({
      discordId: user.id,
      username: user.username,
      avatarUrl: user.displayAvatarURL(),
    });

    const existingRecords = await getMemberLearningProgress(user.id);
    const existing = existingRecords.find((r) => r.programme_day === dayNumber);

    if (existing?.practical_task_done) {
      return interaction.editReply({
        content: `✅ You've already marked the **Day ${dayNumber}** practical task as completed! Keep up the great work!`,
      });
    }

    await upsertLearningProgress({
      discordId: user.id,
      programmeDay: dayNumber,
      practicalTaskDone: true,
    });

    // Award +5 bonus XP for hands-on practical task
    try {
      await updateMemberPoints(
        user.id,
        0, // 0 points
        5, // +5 XP
        `git_task_day_${dayNumber}`,
        `day_${dayNumber}`
      );
    } catch (xpErr) {
      logger.warn('Could not award XP for practical task', { error: xpErr.message });
    }

    const replyEmbed = new EmbedBuilder()
      .setColor(BRAND_GREEN)
      .setTitle('🛠️ Practical Task Completed!')
      .setDescription(
        `Great job completing today's hands-on terminal exercise for **Day ${dayNumber}**!\n\n` +
        `🎁 **Reward:** **+5 XP** has been added to your profile and community leaderboard standings!\n\n` +
        `> _"You don't truly understand Git until you run the commands in a real terminal."_`
      )
      .setFooter({ text: 'Check your progress anytime with `/learning progress`' });

    await interaction.editReply({ embeds: [replyEmbed] });
  } catch (err) {
    logger.error('Error handling git learning task interaction', { error: err.message, dayNumber });
    await interaction.editReply({
      content: 'Could not update your practical task status right now. Please try again.',
    });
  }
}

