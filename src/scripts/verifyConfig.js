/**
 * src/scripts/verifyConfig.js
 * Verifies all critical configuration values are set correctly for production.
 * Run: node --env-file=.env src/scripts/verifyConfig.js
 */

import 'dotenv/config';

const checks = [];

function check(label, value, expected = null, validator = null) {
  let status;
  if (validator) {
    status = validator(value) ? 'PASS' : 'FAIL';
  } else if (expected !== null) {
    status = value === expected ? 'PASS' : 'FAIL';
  } else {
    status = (value && !String(value).startsWith('your_')) ? 'PASS' : 'FAIL';
  }
  checks.push({ label, value: String(value ?? '(not set)'), expected: expected ? String(expected) : null, status });
}

// --- Discord ---
check('DISCORD_TOKEN',       process.env.DISCORD_TOKEN);
check('DISCORD_CLIENT_ID',   process.env.DISCORD_CLIENT_ID);
check('DISCORD_GUILD_ID',    process.env.DISCORD_GUILD_ID);
check('DISCORD_QUIZ_CHANNEL_ID', process.env.DISCORD_QUIZ_CHANNEL_ID);
check('TEST_CHANNEL_ID',     process.env.TEST_CHANNEL_ID);
check('ADMIN_ROLE_NAME',     process.env.ADMIN_ROLE_NAME);

// --- Supabase ---
check('SUPABASE_URL',            process.env.SUPABASE_URL);
check('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- App Config ---
check('NODE_ENV=production',    process.env.NODE_ENV,                    'production');
check('TZ=Asia/Kolkata',        process.env.TZ,                          'Asia/Kolkata');
check('QUIZ_POST_TIME=09:00',   process.env.QUIZ_POST_TIME,              '09:00');
check('QUIZ_QUESTION_TIME=15',  process.env.QUIZ_QUESTION_TIME_SECONDS,  '15');
check('COUNTDOWN=30',           process.env.QUIZ_START_COUNTDOWN_SECONDS, '30');

// --- Optional (warn if missing) ---
const optional = [
  ['DISCORD_ANNOUNCEMENTS_CHANNEL_ID', process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID],
  ['DISCORD_LEADERBOARD_CHANNEL_ID',   process.env.DISCORD_LEADERBOARD_CHANNEL_ID],
  ['DISCORD_LOGS_CHANNEL_ID',          process.env.DISCORD_LOGS_CHANNEL_ID],
  ['DISCORD_GENERAL_CHANNEL_ID',       process.env.DISCORD_GENERAL_CHANNEL_ID],
];

console.log('\n══════════════════════════════════════════════');
console.log('  HCC AutoEngage — Configuration Verification ');
console.log('══════════════════════════════════════════════\n');

let failed = 0;
for (const c of checks) {
  const icon = c.status === 'PASS' ? '✅' : '❌';
  if (c.status === 'FAIL') failed++;
  const expected = c.expected ? `  (expected: ${c.expected})` : '';
  const val = c.status === 'PASS' && c.label.toLowerCase().includes('token')
    ? c.value.slice(0, 10) + '...[REDACTED]'
    : c.status === 'PASS' && c.label.toLowerCase().includes('key')
    ? '[REDACTED]'
    : c.value;
  console.log(`  ${icon}  ${c.label.padEnd(32)}  ${val}${expected}`);
}

console.log('\n── Optional channels ──────────────────────────');
for (const [name, val] of optional) {
  const configured = val && !String(val).startsWith('your_');
  console.log(`  ${configured ? '✅' : '⚠️ '}  ${name.padEnd(36)}  ${configured ? val : '(not set — please add channel ID)'}`);
}

console.log('\n══════════════════════════════════════════════');
if (failed === 0) {
  console.log('  🎉  All required checks PASSED — ready for production!\n');
} else {
  console.log(`  ⚠️   ${failed} check(s) FAILED — review and fix before deploying.\n`);
}

