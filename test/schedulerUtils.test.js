import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyQuizCron, isSameGuild } from '../src/services/automation/schedulerUtils.js';

test('builds the 09:00 IST cron expression', () => {
  assert.equal(buildDailyQuizCron('09:00'), '0 9 * * *');
});

test('rejects invalid post times instead of silently scheduling another time', () => {
  assert.throws(() => buildDailyQuizCron('25:00'), /Invalid QUIZ_POST_TIME/);
});

test('accepts only text channels in the configured guild', () => {
  const channel = { guildId: 'guild-1', isTextBased: () => true };
  assert.equal(isSameGuild(channel, 'guild-1'), true);
  assert.equal(isSameGuild(channel, 'guild-2'), false);
  assert.equal(isSameGuild({ guildId: 'guild-1', isTextBased: () => false }, 'guild-1'), false);
});
