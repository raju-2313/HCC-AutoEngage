/**
 * src/scripts/startLiveQuiz.js
 * CLI runner to start a live 10-question timer-based quiz challenge.
 *
 * Usage: node src/scripts/startLiveQuiz.js [channelId] [questionCount] [secondsPerQuestion]
 */

import 'dotenv/config';
import { createClient } from '../bot/client.js';
import { runLiveQuizSession } from '../services/quiz/liveQuizRunner.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  const channelId = process.argv[2] || config.discord.channels.test || config.discord.channels.quiz;
  const questionCount = parseInt(process.argv[3], 10) || 10;
  const secondsPerQuestion = parseInt(process.argv[4], 10) || 25;

  console.log(`\n🚀 Preparing to launch Live Quiz Session in channel: ${channelId}`);
  console.log(`   • Questions: ${questionCount}`);
  console.log(`   • Timer:     ${secondsPerQuestion} seconds per question\n`);

  const client = createClient();

  client.once('clientReady', async () => {
    logger.info('Connected to Discord. Commencing Live Quiz Session...');
    try {
      await runLiveQuizSession({
        client,
        channelId,
        questionCount,
        secondsPerQuestion,
      });
      console.log('\n🎉 Live Quiz Session Completed Successfully!\n');
    } catch (err) {
      console.error('\n❌ Live Quiz Session error:', err.message);
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  await client.login(config.discord.token);
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});

