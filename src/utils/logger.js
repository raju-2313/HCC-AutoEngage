/**
 * src/utils/logger.js
 * Lightweight structured logger.
 * Uses ISO timestamps and log levels: debug | info | warn | error
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const COLORS = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

const configured_level = (process.env.LOG_LEVEL || 'info').toLowerCase();
const min_level = LEVELS[configured_level] ?? LEVELS.info;

function format(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const meta_str = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${COLORS[level]}[${ts}] [${level.toUpperCase().padEnd(5)}] ${message}${meta_str}${COLORS.reset}`;
}

export const logger = {
  debug(msg, meta) { if (LEVELS.debug >= min_level) console.debug(format('debug', msg, meta)); },
  info(msg, meta)  { if (LEVELS.info  >= min_level) console.log(format('info',  msg, meta)); },
  warn(msg, meta)  { if (LEVELS.warn  >= min_level) console.warn(format('warn',  msg, meta)); },
  error(msg, meta) { if (LEVELS.error >= min_level) console.error(format('error', msg, meta)); },
};
