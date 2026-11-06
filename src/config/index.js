/**
 * src/config/index.js
 * Central configuration loader.
 * All environment variables are validated here at startup.
 */

import 'dotenv/config';

function require_env(name) {
  const value = process.env[name];
  if (!value || value.startsWith('your_')) {
    throw new Error(
      `Missing or unconfigured environment variable: ${name}\n` +
      `  → Copy .env.example to .env and fill in real values.`
    );
  }
  return value;
}

function optional_env(name, fallback = '') {
  const value = process.env[name];
  return (!value || value.startsWith('your_')) ? fallback : value;
}

export const config = {
  discord: {
    token:    require_env('DISCORD_TOKEN'),
    clientId: require_env('DISCORD_CLIENT_ID'),
    guildId:  require_env('DISCORD_GUILD_ID'),
    channels: {
      announcements: optional_env('DISCORD_ANNOUNCEMENTS_CHANNEL_ID'),
      // TESTING OVERRIDE: Bound strictly to autoengage-testing (1567916304118063124) during testing
      quiz:          optional_env('TEST_CHANNEL_ID', '1567916304118063124'),
      leaderboard:   optional_env('DISCORD_LEADERBOARD_CHANNEL_ID'),
      logs:          optional_env('DISCORD_LOGS_CHANNEL_ID'),
      test:          optional_env('TEST_CHANNEL_ID', '1567916304118063124'),
    },
  },
  supabase: {
    url:            require_env('SUPABASE_URL'),
    anonKey:        optional_env('SUPABASE_ANON_KEY'),
    serviceRoleKey: require_env('SUPABASE_SERVICE_ROLE_KEY'),
  },
  app: {
    env:          process.env.NODE_ENV || 'development',
    logLevel:     process.env.LOG_LEVEL || 'info',
    timezone:     process.env.TZ || 'Asia/Kolkata',
    quizPostTime: process.env.QUIZ_POST_TIME || '12:40',
    countdownSeconds: parseInt(process.env.QUIZ_START_COUNTDOWN_SECONDS || '30', 10),
    questionTimeSeconds: parseInt(process.env.QUIZ_QUESTION_TIME_SECONDS || '15', 10),
    adminRoleName: process.env.ADMIN_ROLE_NAME || 'HCC Admin',
  },
};

