/**
 * src/scripts/publishTodayQuiz.js
 * Manual or CLI trigger to publish today's daily quiz into the configured Discord channel.
 *
 * Usage: node src/scripts/publishTodayQuiz.js [channelId]
 */

import 'dotenv/config';
import { createClient } from '../bot/client.js';
import { publishDailyQuiz } from '../services/quiz/quizService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  const channelId = process.argv[2] || config.discord.channels.quiz || config.discord.channels.announcements;

  if (!channelId) {
    console.error('❌ No channel specified. Provide a channel ID as an argument or configure DISCORD_QUIZ_CHANNEL_ID in .env:');
    console.error('   node src/scripts/publishTodayQuiz.js <channel_id>\n');
    process.exit(1);
  }

  const client = createClient();

  client.once('clientReady', async () => {
    logger.info('Bot connected to Discord. Publishing daily quiz...');
    try {
      const { quiz, message } = await publishDailyQuiz({ client, channelId });
      console.log('\n🎉 Daily Quiz Successfully Published to Discord!');
      console.log(`   • Quiz ID:    ${quiz.id}`);
      console.log(`   • Title:      ${quiz.title}`);
      console.log(`   • Channel ID: ${channelId}`);
      console.log(`   • Message ID: ${message.id}\n`);
    } catch (err) {
      console.error('\n❌ Failed to publish daily quiz:', err.message);
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  await client.login(config.discord.token);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
