/**
 * src/utils/leaderboardTips.js
 * Vague, intriguing community tips to encourage holistic participation
 * without revealing the exact internal scoring algorithms.
 */

import { EmbedBuilder } from 'discord.js';

export const VAGUE_LEADERBOARD_TIPS = [
  "🤫 *Word on the server: Quizzes test your speed, but active discussions in general build silent momentum...*",
  "🎙️ *Rumor has it: Those who share study sessions in voice channels seem to rise even when no quizzes are live...*",
  "✨ *The algorithm favors the well-rounded: Touching multiple facets of the community unlocks quiet synergy bonuses...*",
  "🔥 *Consistency has a gravity of its own: A burning daily streak speaks louder than a single day's sprint...*",
  "🤝 *Helping a peer untangle a tricky bug might just reward your standing more than you think...*",
  "💬 *Whispers from the mod: High scores aren't just won in the arena—they're cultivated in everyday conversations.*",
  "⚡ *Speed is fine, but true contenders never let their daily flame extinguish.*",
  "❤️ *Some say a thoughtful reaction to a peer's breakthrough ripples all the way to the weekly podium...*",
  "🎯 *Mastering one category gets you noticed; engaging across all five gets you crowned.*",
  "🧠 *The leaderboard remembers daily presence long after the timer stops ticking...*",
];

/**
 * Returns a random vague tip for leaderboard climbers.
 * @returns {string}
 */
export function getRandomLeaderboardTip() {
  const index = Math.floor(Math.random() * VAGUE_LEADERBOARD_TIPS.length);
  return VAGUE_LEADERBOARD_TIPS[index];
}

/**
 * Builds a standalone, dedicated "Whispers from the Mod" card.
 * @param {string|null} customTip
 * @returns {EmbedBuilder}
 */
export function buildStandaloneHintEmbed(customTip = null) {
  const tip = customTip || getRandomLeaderboardTip();
  const HR = '───────────────────────';

  return new EmbedBuilder()
    .setColor(0x8E44AD) // Mystic Royal Violet
    .setAuthor({
      name: 'Whispers from the Mod  🤫',
      iconURL: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f575-fe0f.png',
    })
    .setTitle('💡  Leaderboard Intel Drop')
    .setDescription(
      `> A transmission from the moderation shadows to help you climb the ranks.\n${HR}\n\n` +
      `### 📜  Community Dispatch\n\n` +
      `> ${tip}\n\n` +
      `${HR}\n` +
      `-# 👁️ *The scoring algorithm watches more than just raw speed. Stay active across all channels to unlock the podium.*`
    )
    .setFooter({ text: 'HCC AutoEngage • Secret Community Intel' })
    .setTimestamp();
}

