/**
 * src/utils/embeds.js
 * Reusable Discord embed builders with consistent HCC branding.
 */

import { EmbedBuilder } from "discord.js";

// HCC brand colours
export const COLORS = {
  primary: 0x00c853, // HackerRank green
  success: 0x43a047,
  warning: 0xfb8c00,
  error: 0xe53935,
  info: 0x1e88e5,
  neutral: 0x546e7a,
  HCC_GREEN: 0x00c853,
  HCC_BLUE: 0x1e88e5,
  HCC_AMBER: 0xfb8c00,
  HCC_RED: 0xe53935,
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
    .setFooter({ text: "HCC AutoEngage • HackerRank Campus Crew" });
}
