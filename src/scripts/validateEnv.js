/**
 * src/scripts/validateEnv.js
 * Quick sanity-check: verifies required environment variables are set
 * before attempting to start the bot or deploy commands.
 *
 * Usage: node src/scripts/validateEnv.js
 */

import 'dotenv/config';

const REQUIRED = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL = [
  'DISCORD_ANNOUNCEMENTS_CHANNEL_ID',
  'DISCORD_QUIZ_CHANNEL_ID',
  'DISCORD_LEADERBOARD_CHANNEL_ID',
  'DISCORD_LOGS_CHANNEL_ID',
  'SUPABASE_ANON_KEY',
];

let hasError = false;

console.log('\n🔍 HCC AutoEngage – Environment Validator\n');

console.log('Required variables:');
for (const key of REQUIRED) {
  const val = process.env[key];
  const configured = val && !val.startsWith('your_');
  const icon = configured ? '✅' : '❌';
  const status = configured ? 'SET' : 'MISSING';
  console.log(`  ${icon} ${key.padEnd(40)} ${status}`);
  if (!configured) hasError = true;
}

console.log('\nOptional variables (for future phases):');
for (const key of OPTIONAL) {
  const val = process.env[key];
  const configured = val && !val.startsWith('your_');
  const icon = configured ? '✅' : '⬜';
  const status = configured ? 'SET' : 'not set';
  console.log(`  ${icon} ${key.padEnd(40)} ${status}`);
}

console.log('');

if (hasError) {
  console.error('❌ One or more required variables are missing.');
  console.error('   → Copy .env.example to .env and fill in your credentials.\n');
  process.exit(1);
} else {
  console.log('✅ All required variables are configured. Ready to start!\n');
}

