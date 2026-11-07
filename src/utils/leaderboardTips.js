/**
 * src/utils/leaderboardTips.js
 * Vague, intriguing community tips to encourage holistic participation
 * without revealing the exact internal scoring algorithms.
 */

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
