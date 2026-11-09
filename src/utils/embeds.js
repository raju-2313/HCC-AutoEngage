/**
 * src/utils/embeds.js
 * Reusable Discord embed builders with consistent HCC branding.
 */

import { EmbedBuilder } from 'discord.js';

// HCC brand colours
export const COLORS = {
  primary:   0x00C853, // HackerRank green
  success:   0x43A047,
  warning:   0xFB8C00,
  error:     0xE53935,
  info:      0x1E88E5,
  neutral:   0x546E7A,
  HCC_GREEN: 0x00C853,
  HCC_BLUE:  0x1E88E5,
  HCC_AMBER: 0xFB8C00,
  HCC_RED:   0xE53935,
};

export function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function primaryEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' });
}

