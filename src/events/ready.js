/**
 * src/events/ready.js
 * Fires once when the bot successfully connects to the Discord Gateway.
 *
 * Uses 'clientReady' — the correct event name in Discord.js v14.
 * ('ready' also works in v14 but emits a deprecation warning; it will be
 *  removed in v15. Always use 'clientReady' for v14+ compatibility.)
 */

import { ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';
import { initScheduler } from '../services/automation/scheduler.js';
import { initializeVoiceRecovery } from '../services/voice/voiceService.js';

export const name = 'clientReady';
export const once = true;

export function execute(client) {
  logger.info(`Bot is online`, {
    tag:    client.user.tag,
    guilds: client.guilds.cache.size,
    users:  client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
  });

  // Initialize Automation Scheduler (Phase 5)
  initScheduler(client);

  // Initialize Voice Session Recovery (Community Engine)
  initializeVoiceRecovery(client);

  // Set a rotating presence
  const activities = [
    { name: 'Daily Tech Quizzes 🧠', type: ActivityType.Playing },
    { name: 'HCC Community 🚀',      type: ActivityType.Watching },
    { name: '/help for commands',    type: ActivityType.Listening },
  ];

  let index = 0;
  const rotate = () => {
    const activity = activities[index % activities.length];
    client.user.setPresence({
      status: 'online',
      activities: [activity],
    });
    index++;
  };

  rotate();
  setInterval(rotate, 30_000); // rotate every 30 s
}

