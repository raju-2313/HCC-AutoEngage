/**
 * src/events/interactionCreate.js
 * Routes every incoming interaction to the correct command handler.
 */

import { MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';
import { handleQuizAnswerInteraction } from '../services/quiz/quizService.js';
import {
  buildOverallLeaderboardEmbed,
  buildLeaderboardActionRow,
} from '../services/recognition/engagementScoringService.js';

export const name  = 'interactionCreate';
export const once  = false;

export async function execute(interaction, client) {
  // ── Slash Commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
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
        const reply = { content: 'Unable to load that leaderboard right now. Please try again.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }
    return;
  }
}
