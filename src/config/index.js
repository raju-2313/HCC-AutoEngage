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
      // Resolve quiz channel: prioritize DISCORD_QUIZ_CHANNEL_ID;
      // in production, default to main community channel '1538470672722952303';
      // in development/test, fall back safely to TEST_CHANNEL_ID ('1567916304118063124').
      quiz:          optional_env(
        'DISCORD_QUIZ_CHANNEL_ID',
        process.env.NODE_ENV === 'production'
          ? '1538470672722952303'
          : optional_env('TEST_CHANNEL_ID', '1567916304118063124')
      ),
      leaderboard:   optional_env('DISCORD_LEADERBOARD_CHANNEL_ID'),
      logs:          optional_env('DISCORD_LOGS_CHANNEL_ID'),
      // Main general/discussion channel for broader engagement tracking
      general:       optional_env('DISCORD_GENERAL_CHANNEL_ID'),
      // Test channel kept for admin force-trigger commands only
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
    gitProgrammeStartDate: optional_env('GIT_PROGRAMME_START_DATE', '2026-11-30'),
    learningPostTime: process.env.GIT_LEARNING_POST_TIME || '09:00',
    quizPostTime: process.env.QUIZ_POST_TIME || '19:00',
    countdownSeconds: parseInt(process.env.QUIZ_START_COUNTDOWN_SECONDS || '30', 10),
    questionTimeSeconds: parseInt(process.env.QUIZ_QUESTION_TIME_SECONDS || '15', 10),
    adminRoleName: process.env.ADMIN_ROLE_NAME || 'HCC Admin',
    adminUserIds: (optional_env('ADMIN_USER_IDS', ''))
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  stickers: {
    discoveryCron: optional_env('STICKER_DISCOVERY_CRON', '0 11 * * 1'),
    maxScanCount: parseInt(optional_env('STICKER_MAX_SCAN_COUNT', '15'), 10),
  },
};

