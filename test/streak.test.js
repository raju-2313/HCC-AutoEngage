import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDailyStreak } from '../src/services/quiz/streak.js';

test('does not increase a streak for multiple attempts on the same day', () => {
  assert.equal(calculateDailyStreak(4, '2026-11-05', '2026-11-05'), 4);
});

test('increments a streak on the next calendar day', () => {
  assert.equal(calculateDailyStreak(4, '2026-11-04', '2026-11-05'), 5);
});

test('resets a streak after a missed day', () => {
  assert.equal(calculateDailyStreak(4, '2026-11-03', '2026-11-05'), 1);
});
