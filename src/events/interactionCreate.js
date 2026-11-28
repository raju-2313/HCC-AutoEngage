/**
 * src/events/interactionCreate.js
 * Routes every incoming interaction to the correct command handler.
 */

import { MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';
import { handleQuizAnswerInteraction } from '../services/quiz/quizService.js';
import { recordDailyParticipation } from '../database/queries/members.js';
import {
  buildOverallLeaderboardEmbed,
  buildLeaderboardActionRow,
} from '../services/recognition/engagementScoringService.js';
import { handleStickerButtonInteraction } from '../services/stickers/reviewService.js';
import { handleEmojiButtonInteraction } from '../services/emojis/reviewService.js';
import {
  handleGitLearningStatusInteraction,
  handleGitLearningTaskInteraction,
} from '../services/learning/gitLearningManager.js';

export const name  = 'interactionCreate';
export const once  = false;

export async function execute(interaction, client) {
  // ── Slash Commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    // Record daily login & participation streak asynchronously
    recordDailyParticipation(interaction.user.id, 'command_login').catch(() => {});

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown slash command received`, { name: interaction.commandName });
      return interaction.reply({
        embeds: [errorEmbed('Unknown Command', `\`/${interaction.commandName}\` is not registered.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      logger.info(`Executing command`, {
        command: interaction.commandName,
        user:    interaction.user.tag,
        guild:   interaction.guild?.name ?? 'DM',
      });

      await command.execute(interaction);
    } catch (err) {
      logger.error(`Command execution failed`, {
        command: interaction.commandName,
        error:   err.message,
        stack:   err.stack,
      });

      const errorReply = {
        embeds: [errorEmbed('Something went wrong', 'An unexpected error occurred. Please try again later.')],
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply).catch(() => {});
      } else {
        await interaction.reply(errorReply).catch(() => {});
      }
    }
    return;
  }

  // ── Button Interactions ─────────────────────────────────────────────────────
  if (interaction.isButton()) {
    logger.debug(`Button interaction received`, {
      customId: interaction.customId,
      user:     interaction.user.tag,
    });

    if (interaction.customId.startsWith('quiz_ans:')) {
      return handleQuizAnswerInteraction(interaction);
    }

    if (interaction.customId.startsWith('sticker:')) {
      return handleStickerButtonInteraction(interaction);
    }

    if (interaction.customId.startsWith('emoji:')) {
      return handleEmojiButtonInteraction(interaction);
    }

    if (interaction.customId.startsWith('gitlearn:status:')) {
      return handleGitLearningStatusInteraction(interaction);
    }

    if (interaction.customId.startsWith('gitlearn:task:')) {
      return handleGitLearningTaskInteraction(interaction);
    }

    // ── Sprint teaser buttons (sent with the Nov 30 teaser message) ──────────
    if (interaction.customId === 'sprint_im_in') {
      return interaction.reply({
        embeds: [
          {
            color: 0x00C853,
            title: "🔥 You're locked in!",
            description:
              "You're officially on the list for the **HCC 15-Day Git & GitHub Sprint!**\n\n" +
              "Here's what to expect starting **Monday, 30 Nov at 9:00 AM IST:**\n" +
              "📖 A morning learning card drops daily\n" +
              "⚡ An evening 10-question timed quiz follows at 7:00 PM\n" +
              "🏆 Points update the community leaderboard in real-time\n\n" +
              "**Use `/learning progress` anytime** to track your Day-by-Day score, tasks, and quiz results.\n\n" +
              "_See you Monday! Let's get those commits flowing. 🚀_",
            footer: { text: "HCC AutoEngage • Git & GitHub Sprint • Only you can see this message" },
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.customId === 'sprint_remind_me') {
      return interaction.reply({
        embeds: [
          {
            color: 0x5865F2,
            title: '⏰ Reminder Set!',
            description:
              "Got it! The **15-Day Git & GitHub Sprint** kicks off on **Monday, 30 Nov 2026 at 9:00 AM IST.**\n\n" +
              "The bot will automatically post the **Day 1 morning learning card** in this channel — you can't miss it.\n\n" +
              "**Tip:** Use `/learning progress` after the sprint starts to see your personal scorecard.\n\n" +
              "_No action needed from you — just show up on Monday!_ 🗓️",
            footer: { text: "HCC AutoEngage • Git & GitHub Sprint • Only you can see this message" },
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.customId.startsWith('lb_view:')) {
      const period = interaction.customId.replace('lb_view:', '');
      try {
        const embed = await buildOverallLeaderboardEmbed(period);
        const row   = buildLeaderboardActionRow(period);
        await interaction.update({
          embeds: [embed],
          components: [row],
        });
      } catch (err) {
        logger.error('Error switching leaderboard period view', { period, error: err.message });
      }
      return;
    }
    return;
  }
}

