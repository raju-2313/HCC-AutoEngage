/**
 * src/services/quiz/sessionQuestionManager.js
 * Manages daily 10-question banks for the 7-day challenge (Nov 9 - Nov 15, 2026).
 *
 * Source of truth: src/data/question-banks/day-0X-<topic>.json
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANKS_DIR = join(__dirname, '..', '..', 'data', 'question-banks');

export const CHALLENGE_CALENDAR = {
  '2026-11-09': {
    dayNumber: 1,
    topic: 'Python Basics',
    fileName: 'day-01-python.json',
    category: 'python',
    dateLabel: 'Monday, 9 Nov 2026 @ 09:00 AM IST (Day 1)',
    startTime: '09:00 AM IST',
  },
  '2026-11-10': {
    dayNumber: 2,
    topic: 'C Programming Basics',
    fileName: 'day-02-c-basics.json',
    category: 'c',
    dateLabel: 'Tuesday, 10 Nov 2026 @ 09:00 AM IST (Day 2)',
    startTime: '09:00 AM IST',
  },
  '2026-11-11': {
    dayNumber: 3,
    topic: 'Loops & Iterations',
    fileName: 'day-03-loops.json',
    category: 'loops',
    dateLabel: 'Wednesday, 11 Nov 2026 @ 09:00 AM IST (Day 3)',
    startTime: '09:00 AM IST',
  },
  '2026-11-12': {
    dayNumber: 4,
    topic: 'Conditionals & Logic',
    fileName: 'day-04-conditionals.json',
    category: 'conditionals',
    dateLabel: 'Thursday, 12 Nov 2026 @ 09:00 AM IST (Day 4)',
    startTime: '09:00 AM IST',
  },
  '2026-11-13': {
    dayNumber: 5,
    topic: 'Git & GitHub',
    fileName: 'day-05-git-github.json',
    category: 'git',
    dateLabel: 'Friday, 13 Nov 2026 @ 09:00 AM IST (Day 5)',
    startTime: '09:00 AM IST',
  },
  '2026-11-14': {
    dayNumber: 6,
    topic: 'HTML & Web Foundations',
    fileName: 'day-06-html.json',
    category: 'web',
    dateLabel: 'Saturday, 14 Nov 2026 @ 09:00 AM IST (Day 6)',
    startTime: '09:00 AM IST',
  },
  '2026-11-15': {
    dayNumber: 7,
    topic: 'Tech & Computer Basics',
    fileName: 'day-07-tech-fundamentals.json',
    category: 'fundamentals',
    dateLabel: 'Sunday, 15 Nov 2026 @ 09:00 AM IST (Day 7)',
    startTime: '09:00 AM IST',
  },
};

/**
 * Loads and validates the question set for a given date (YYYY-MM-DD).
 * @param {string} dateStr e.g. '2026-11-09'
 * @returns {Array<Object>} 10 validated questions
 */
export function getDayQuestionSet(dateStr) {
  const meta = CHALLENGE_CALENDAR[dateStr];
  if (!meta) {
    logger.warn(`No curated challenge questions scheduled for date: ${dateStr}`);
    return null;
  }

  const filePath = join(BANKS_DIR, meta.fileName);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(raw);
    validateQuestionSet(questions, meta);
    return { meta, questions };
  } catch (err) {
    logger.error(`Failed to load question set for ${dateStr} from ${filePath}`, { error: err.message });
    throw err;
  }
}

/**
 * Validates a 10-question set against schema and distribution rules.
 */
export function validateQuestionSet(questions, meta = {}) {
  if (!Array.isArray(questions)) {
    throw new Error(`Question set must be an array`);
  }
  if (questions.length !== 10) {
    throw new Error(`Question set for ${meta.topic || 'day'} must contain exactly 10 questions. Found: ${questions.length}`);
  }

  const diffCounts = { easy: 0, medium: 0, challenge: 0 };
  const seenIds = new Set();

  questions.forEach((q, idx) => {
    if (!q.id) throw new Error(`Question at index ${idx} missing unique id`);
    if (seenIds.has(q.id)) throw new Error(`Duplicate question id ${q.id} at index ${idx}`);
    seenIds.add(q.id);

    if (!q.topic) throw new Error(`Question ${q.id} missing topic`);
    if (!q.questionText) throw new Error(`Question ${q.id} missing questionText`);
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${q.id} must have exactly 4 options`);
    }

    const optIds = q.options.map(o => o.id);
    if (!optIds.includes('A') || !optIds.includes('B') || !optIds.includes('C') || !optIds.includes('D')) {
      throw new Error(`Question ${q.id} options must have IDs A, B, C, D`);
    }

    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) {
      throw new Error(`Question ${q.id} correctOption must be one of A, B, C, D`);
    }

    if (!q.explanation) throw new Error(`Question ${q.id} missing explanation`);
    if (q.timeLimitSeconds && ![15, 20].includes(q.timeLimitSeconds)) throw new Error(`Question ${q.id} timeLimitSeconds must be 15 or 20`);

    const diff = (q.difficulty || '').toLowerCase();
    if (!['easy', 'medium', 'challenge'].includes(diff)) {
      throw new Error(`Question ${q.id} difficulty must be easy, medium, or challenge`);
    }
    diffCounts[diff] = (diffCounts[diff] || 0) + 1;
  });

  if (diffCounts.easy !== 6 || diffCounts.medium !== 3 || diffCounts.challenge !== 1) {
    throw new Error(
      `Difficulty distribution mismatch for ${meta.topic || 'day'}: expected 6 easy, 3 medium, 1 challenge. Found: ${JSON.stringify(diffCounts)}`
    );
  }

  return true;
}

/**
 * Validates all 7 question banks.
 */
export function validateAllBanks() {
  const results = [];
  for (const [dateStr, meta] of Object.entries(CHALLENGE_CALENDAR)) {
    const data = getDayQuestionSet(dateStr);
    results.push({
      date: dateStr,
      topic: meta.topic,
      fileName: meta.fileName,
      count: data.questions.length,
      valid: true,
    });
  }
  return results;
}

