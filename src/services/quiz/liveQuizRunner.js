/**
 * src/services/quiz/liveQuizRunner.js
 * Automated Timer-Based Live Community Quiz Session Runner.
 *
 * Runs a multi-question test (e.g. 10 questions) in a public channel.
 * Advances through questions automatically on a countdown timer, reveals explanations,
 * and posts a dramatic live podium at the end.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/embeds.js';
import { createQuiz, publishQuiz, closeQuiz } from '../../database/queries/quizzes.js';
import { getRandomSampleQuestions } from './questionBank.js';
import { supabaseAdmin } from '../../database/client.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HR = '┄'.repeat(28);

const CATEGORY_ICONS = {
  javascript: '🟨', python: '🐍', dsa: '🌳',
  databases: '🗄️', git: '🔀', web: '🌐', http: '🌐', systems: '⚙️', default: '💡',
};
function catIcon(cat = '') {
  return CATEGORY_ICONS[cat.toLowerCase()] ?? CATEGORY_ICONS.default;
}

const DIFFICULTY_CONFIG = {
  beginner: { label: '🌱 Beginner', color: COLORS.success },
  advanced: { label: '🔥 Advanced', color: COLORS.warning },
};

const OPTION_STYLES = {
  A: { emoji: '🅰️', style: ButtonStyle.Primary },
  B: { emoji: '🅱️', style: ButtonStyle.Primary },
  C: { emoji: '🇨',  style: ButtonStyle.Primary },
  D: { emoji: '🇩',  style: ButtonStyle.Primary },
};

/** Returns a visual progress bar like ▓▓▓░░░░░░░ for the question index. */
function questionProgress(current, total) {
  const filled = Math.round((current / total) * 10);
  return '▓'.repeat(filled) + '░'.repeat(10 - filled);
}

/** Countdown dots message that creates a "ticking" feel via edits. */
async function animatedCountdown(channel, fromSeconds) {
  const dots = ['⠙', '⠸', '⠴', '⠦', '⠇', '⠋'];
  const msg = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFA500)
        .setDescription(`### ${dots[0]}  First question starts in **${fromSeconds}s**...\n*Get your thinking caps on!* 🧠`)
    ],
  });

  for (let i = fromSeconds - 1; i > 0; i--) {
    await sleep(1000);
    const dot = dots[i % dots.length];
    await msg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFFA500)
          .setDescription(`### ${dot}  First question starts in **${i}s**...\n*Get your thinking caps on!* 🧠`)
      ],
    }).catch(() => {});
  }

  await sleep(1000);
  await msg.delete().catch(() => {});
}

// ─── Main runner ──────────────────────────────────────────────────────────────

/**
 * Runs a live timer-based quiz session in a channel.
 * @param {Object} options
 * @param {import('discord.js').Client} options.client
 * @param {string} options.channelId
 * @param {number} [options.questionCount=10]
 * @param {number} [options.secondsPerQuestion=25]
 */
export async function runLiveQuizSession({
  client,
  channelId,
  questionCount = 10,
  secondsPerQuestion = 25,
}) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found or inaccessible by the bot.`);
  }

  const sampleQuestions = getRandomSampleQuestions(questionCount);
  logger.info('Starting live quiz session', {
    channelId,
    questionCount: sampleQuestions.length,
    secondsPerQuestion,
  });

  // Track session scores in memory: Map<discordId, { username, score, correctCount }>
  const sessionScores = new Map();

  // ── 1. Dramatic Announcement ──────────────────────────────────────────────
  const categories = [...new Set(sampleQuestions.map((q) => q.category))];
  const categoryList = categories.map((c) => `${catIcon(c)} ${c.toUpperCase()}`).join('  ·  ');

  const introEmbed = new EmbedBuilder()
    .setColor(0x5865F2)  // Discord blurple — signals "event starting"
    .setTitle('⚡  HCC Live Tech Challenge  ⚡')
    .setDescription(
      `## 🚀  ${sampleQuestions.length}-Question Blitz Starting Now!\n\n` +
      `${HR}\n\n` +
      `📚  **Topics covered:** ${categoryList}\n\n` +
      `⏱️  **${secondsPerQuestion} seconds** per question — no second chances!\n` +
      `🏆  **Points & XP** awarded live for every correct answer\n` +
      `🥇  **Podium** revealed after the final question\n\n` +
      `${HR}\n\n` +
      `> _React fast, think sharp — good luck!_ 🎯`
    )
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew  │  Answers are private to each member' })
    .setTimestamp();

  await channel.send({
    content: '⚡ **@everyone — A Live Tech Quiz Challenge is starting right now!** 🎯 Hop in and test your speed!',
    embeds: [introEmbed],
  });

  // Animated countdown before Q1
  await animatedCountdown(channel, 5);

  // ── 2. Loop Through Questions ───────────────────────────────────────────────
  for (let i = 0; i < sampleQuestions.length; i++) {
    const qData   = sampleQuestions[i];
    const qNumber = i + 1;
    const totalQ  = sampleQuestions.length;
    const diff    = DIFFICULTY_CONFIG[qData.difficulty] ?? DIFFICULTY_CONFIG.beginner;
    const icon    = catIcon(qData.category);
    const bar     = questionProgress(qNumber - 1, totalQ);

    // A. Create & publish quiz record in Supabase
    const createdQuiz = await createQuiz({
      title: `Live Q${qNumber}: ${qData.title}`,
      description: `Live Quiz Question ${qNumber} of ${totalQ}`,
      category: qData.category,
      difficulty: qData.difficulty,
      pointsReward: qData.pointsReward,
      xpReward: qData.xpReward,
      createdBy: 'live_session',
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

    // Discord relative-time countdown tag
    const endTime  = Date.now() + secondsPerQuestion * 1000;
    const unixEnd  = Math.floor(endTime / 1000);

    // Options block
    const optionsText = qData.options
      .map((opt) => {
        const cfg = OPTION_STYLES[opt.id] ?? { emoji: opt.id };
        return `${cfg.emoji}  **${opt.id}.**  ${opt.text}`;
      })
      .join('\n\n');

    // Description
    let desc = `### ${qData.questionText}\n`;
    if (qData.codeSnippet) {
      desc += `\n\`\`\`javascript\n${qData.codeSnippet}\n\`\`\`\n`;
    }
    desc += `\n${HR}\n\n${optionsText}\n\n${HR}`;

    // Question embed
    const qEmbed = new EmbedBuilder()
      .setColor(diff.color)
      .setTitle(`${icon}  Question ${qNumber} of ${totalQ}  ·  ${qData.title}`)
      .setDescription(desc)
      .addFields(
        { name: '⏳ Time Remaining', value: `<t:${unixEnd}:R>`,                                           inline: true },
        { name: '🎯 Difficulty',     value: diff.label,                                                    inline: true },
        { name: '🎁 Stakes',         value: `**+${qData.pointsReward}** pts  ·  **+${qData.xpReward}** XP`, inline: true }
      )
      .setFooter({
        text: `${bar}  Q${qNumber}/${totalQ}  │  Click your answer below — private to you!`,
      })
      .setTimestamp();

    // Active answer buttons with emoji
    const activeButtons = qData.options.map((opt) => {
      const cfg = OPTION_STYLES[opt.id] ?? { emoji: '', style: ButtonStyle.Primary };
      return new ButtonBuilder()
        .setCustomId(`quiz_ans:${createdQuiz.id}:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setEmoji(cfg.emoji)
        .setStyle(cfg.style);
    });
    const row = new ActionRowBuilder().addComponents(activeButtons);

    const message = await channel.send({ embeds: [qEmbed], components: [row] });

    // Mark quiz active in Supabase
    await publishQuiz(createdQuiz.id, { messageId: message.id, channelId: channel.id });

    // B. Wait for the timer
    await sleep(secondsPerQuestion * 1000);

    // C. Close quiz in Supabase (no late submissions)
    await closeQuiz(createdQuiz.id);

    // D. Fetch attempts
    const { data: attempts } = await supabaseAdmin
      .from('quiz_attempts')
      .select('discord_id, selected_option, is_correct, points_awarded, members(username)')
      .eq('quiz_id', createdQuiz.id);

    const totalSubs   = attempts?.length ?? 0;
    const correctSubs = attempts?.filter((a) => a.is_correct) ?? [];

    // Update session scoreboard
    if (attempts) {
      for (const att of attempts) {
        const uid  = att.discord_id;
        const uname = att.members?.username ?? uid;
        const cur  = sessionScores.get(uid) ?? { userId: uid, username: uname, score: 0, correctCount: 0 };
        cur.username = uname;
        cur.userId = uid;
        if (att.is_correct) {
          cur.score        += att.points_awarded;
          cur.correctCount += 1;
        }
        sessionScores.set(uid, cur);
      }
    }

    // E. Edit question message: disable buttons, highlight correct answer
    const disabledButtons = qData.options.map((opt) => {
      const isCorrectOpt = opt.id === qData.correctOption;
      const cfg = OPTION_STYLES[opt.id] ?? { emoji: '', style: ButtonStyle.Secondary };
      return new ButtonBuilder()
        .setCustomId(`quiz_closed:${createdQuiz.id}:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setEmoji(cfg.emoji)
        .setStyle(isCorrectOpt ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true);
    });
    const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

    // Accuracy line
    const accuracyPct = totalSubs > 0
      ? `${Math.round((correctSubs.length / totalSubs) * 100)}%`
      : 'N/A';

    const resultEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`⏰  Time's Up! — Question ${qNumber} of ${totalQ}`)
      .setDescription(
        `> **✅ Correct Answer:  Option ${qData.correctOption}**\n\n` +
        `### 💡 Explanation\n${qData.explanation}\n\n` +
        `${HR}\n\n` +
        `📊  **${correctSubs.length}** of **${totalSubs}** participant${totalSubs !== 1 ? 's' : ''} answered correctly  ·  Accuracy: **${accuracyPct}**`
      )
      .setFooter({
        text: qNumber < totalQ
          ? `⏭️  Next question in 5 seconds...  (Q${qNumber + 1}/${totalQ})`
          : '🏆  Calculating final scores...',
      });

    await message.edit({ embeds: [qEmbed, resultEmbed], components: [disabledRow] }).catch(() => {});

    // Intermission
    if (qNumber < totalQ) {
      await sleep(5000);
    }
  }

  // ── 3. Dramatic Podium Reveal ──────────────────────────────────────────────
  await sleep(2000);

  const sorted = Array.from(sessionScores.values()).sort(
    (a, b) => b.score - a.score || b.correctCount - a.correctCount,
  );

  if (sorted.length === 0) {
    // No participants
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.neutral)
          .setTitle('🏁  Quiz Session Complete')
          .setDescription(
            '> No answers were submitted during this session.\n\n' +
            '_Use `/quiz live` again to start a new session. The more, the merrier!_'
          )
          .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' })
          .setTimestamp(),
      ],
    });
    return { totalQuestions: sampleQuestions.length, participants: 0 };
  }

  // "Drumroll" teaser
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFFD700)
        .setDescription(
          `### 🥁  Drumroll please...\n\n` +
          `All **${sampleQuestions.length}** questions complete!\n` +
          `**${sorted.length}** participant${sorted.length !== 1 ? 's' : ''} gave it their all.\n\n` +
          `_Calculating final standings..._ ⚡`
        ),
    ],
  });

  await sleep(3000);

  // Top-3 dramatic reveal (send 3→2→1 with delays so each medal "drops" in)
  const podiumLines = sorted.slice(0, Math.min(3, sorted.length));
  const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
  const PODIUM_COLORS = [0xFFD700, 0xC0C0C0, 0xCD7F32];
  const PODIUM_TITLES = [
    '🏆  CHAMPION  🏆',
    '🥈  Runner-Up  🥈',
    '🥉  Third Place  🥉',
  ];

  for (let p = 0; p < podiumLines.length; p++) {
    await sleep(p === 0 ? 500 : 1800);
    const entry = podiumLines[p];
    const userMention = entry.userId ? `<@${entry.userId}>` : `**${entry.username}**`;
    await channel.send({
      content: `${PODIUM_MEDALS[p]}  Congratulations ${userMention}!`,
      embeds: [
        new EmbedBuilder()
          .setColor(PODIUM_COLORS[p])
          .setTitle(`${PODIUM_MEDALS[p]}  ${PODIUM_TITLES[p]}`)
          .setDescription(
            `## ${userMention}\n` +
            `**${entry.score} Points**  ·  ${entry.correctCount}/${sampleQuestions.length} correct`
          ),
      ],
    });
  }

  await sleep(1500);

  // Full session leaderboard
  const leaderboardLines = sorted
    .slice(0, 10)
    .map((entry, idx) => {
      const medal = PODIUM_MEDALS[idx] ?? `**#${idx + 1}**`;
      const userMention = entry.userId ? `<@${entry.userId}>` : `**${entry.username}**`;
      const bar   = '█'.repeat(Math.round((entry.score / (sorted[0]?.score || 1)) * 8)).padEnd(8, '░');
      return `${medal}  ${userMention}\n╰  \`${bar}\`  ${entry.score} pts  ·  ${entry.correctCount}/${sampleQuestions.length} ✅`;
    })
    .join('\n\n');

  const finalEmbed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🏆  Final Session Standings')
    .setDescription(
      `${leaderboardLines}\n\n${HR}\n\n` +
      `🎉  Great job to all **${sorted.length}** participant${sorted.length !== 1 ? 's' : ''}!\n` +
      `Points & streaks have been saved to your permanent profile.\n` +
      `Use \`/profile\` to see your updated stats and badges.`
    )
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew  │  Live Quiz Session Complete' })
    .setTimestamp();

  await channel.send({ embeds: [finalEmbed] });

  logger.info('Live quiz session completed successfully', {
    channelId,
    totalQuestions: sampleQuestions.length,
    participants: sessionScores.size,
  });

  return { totalQuestions: sampleQuestions.length, participants: sessionScores.size };
}
