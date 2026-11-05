/**
 * src/scripts/testPhase4.js
 * Smoke-test for Phase 4: leaderboard service and profile data.
 */

import {
  buildWeeklyLeaderboardEmbed,
  buildMonthlyLeaderboardEmbed,
  buildAlltimeLeaderboardEmbed,
  takeLeaderboardSnapshot,
} from '../services/recognition/leaderboardService.js';
import { getMemberByDiscordId } from '../database/queries/members.js';

console.log('\n========================================');
console.log(' Phase 4 Smoke Test — Leaderboard & Profile');
console.log('========================================\n');

// ── 1. Weekly leaderboard ────────────────────────────────────────────────────
const weekly = await buildWeeklyLeaderboardEmbed();
console.log('[1] Weekly embed');
console.log('    Title      :', weekly.data.title);
console.log('    Description:', (weekly.data.description ?? '').slice(0, 100));
console.log('    PASS ✅\n');

// ── 2. Monthly leaderboard ───────────────────────────────────────────────────
const monthly = await buildMonthlyLeaderboardEmbed();
console.log('[2] Monthly embed');
console.log('    Title      :', monthly.data.title);
console.log('    Description:', (monthly.data.description ?? '').slice(0, 100));
console.log('    PASS ✅\n');

// ── 3. All-time leaderboard ──────────────────────────────────────────────────
const alltime = await buildAlltimeLeaderboardEmbed();
console.log('[3] All-time embed');
console.log('    Title      :', alltime.data.title);
console.log('    Description:', (alltime.data.description ?? '').slice(0, 150));
console.log('    PASS ✅\n');

// ── 4. Profile data ──────────────────────────────────────────────────────────
const member = await getMemberByDiscordId('818087574018326579');
console.log('[4] Profile data for raju9515');
if (!member) {
  console.log('    FAIL ❌ — member not found');
} else {
  console.log('    username         :', member.username);
  console.log('    level            :', member.level);
  console.log('    total_points     :', member.total_points);
  console.log('    total_xp         :', member.total_xp);
  console.log('    quizzes_completed:', member.quizzes_completed);
  console.log('    quizzes_won      :', member.quizzes_won);
  console.log('    streak_current   :', member.streak_current);
  console.log('    streak_max       :', member.streak_max);
  console.log('    PASS ✅\n');
}

// ── 5. Leaderboard snapshot ──────────────────────────────────────────────────
console.log('[5] Leaderboard snapshot (weekly)');
try {
  const snap = await takeLeaderboardSnapshot('weekly');
  console.log('    Rows inserted    :', Array.isArray(snap) ? snap.length : 1);
  console.log('    PASS ✅\n');
} catch (err) {
  console.log('    FAIL ❌ :', err.message);
}

console.log('========================================');
console.log(' All Phase 4 smoke tests complete');
console.log('========================================\n');
