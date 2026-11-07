/**
 * src/scripts/generatePresentation.js
 * Generates HCC_AutoEngage_Presentation.pptx for the HCC team.
 */

import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', '..', 'HCC_AutoEngage_Presentation.pptx');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9'; // 10.0" x 5.625"
pptx.author = 'HackerRank Campus Crew';
pptx.company = 'HCC Core Team';
pptx.title = 'HCC AutoEngage: System Architecture & Team Overview';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const THEME = {
  bg: '12161A',            // Deep Dark Charcoal
  cardBg: '1A2128',        // Slightly lighter charcoal for cards
  cardBorder: '2D3748',    // Subtle card border
  green: '00C853',         // Official HackerRank Green
  greenLight: '25E675',    // Light Green highlight
  textLight: 'F0F4F8',     // Off-white primary text
  textMuted: '94A3B8',     // Muted slate text
  gold: 'F59E0B',          // Trophy Gold
  blue: '38BDF8',          // Electric Blue
  purple: 'A855F7',        // Accent Purple
};

function addHeader(slide, title, category = 'HCC AUTOENGAGE') {
  // Category Pill / Tag
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 0.45,
    w: 2.2,
    h: 0.28,
    fill: { color: '00C853' },
    line: { color: '00C853', width: 0 },
    rectRadius: 0.05,
  });
  slide.addText(category, {
    x: 0.8,
    y: 0.45,
    w: 2.2,
    h: 0.28,
    fontFace: 'Segoe UI',
    fontSize: 9,
    bold: true,
    color: '12161A',
    align: 'center',
    valign: 'middle',
  });

  // Slide Title
  slide.addText(title, {
    x: 0.8,
    y: 0.8,
    w: 8.4,
    h: 0.55,
    fontFace: 'Segoe UI',
    fontSize: 22,
    bold: true,
    color: THEME.textLight,
  });

  // Thin Accent Divider
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 1.38,
    w: 8.4,
    h: 0,
    line: { color: THEME.cardBorder, width: 1 },
  });
}

function addFooter(slide, slideNum, totalSlides = 12) {
  slide.addText(`HackerRank Campus Crew • HCC AutoEngage`, {
    x: 0.8,
    y: 5.2,
    w: 6.0,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 9,
    color: THEME.textMuted,
  });
  slide.addText(`${slideNum} / ${totalSlides}`, {
    x: 7.2,
    y: 5.2,
    w: 2.0,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 9,
    bold: true,
    color: THEME.green,
    align: 'right',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1: Title & Cover Slide
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };

  // Background subtle card container
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 0.8,
    w: 8.4,
    h: 4.025,
    fill: { color: THEME.cardBg },
    line: { color: THEME.green, width: 1.5 },
    rectRadius: 0.1,
  });

  // Top Tag
  s.addText('HACKERRANK CAMPUS CREW  •  TECHNICAL OVERVIEW', {
    x: 1.3,
    y: 1.3,
    w: 7.4,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 11,
    bold: true,
    color: THEME.green,
  });

  // Main Title
  s.addText('HCC AutoEngage', {
    x: 1.3,
    y: 1.65,
    w: 7.4,
    h: 0.9,
    fontFace: 'Segoe UI',
    fontSize: 40,
    bold: true,
    color: THEME.textLight,
  });

  // Subtitle
  s.addText('Automated Discord Learning, Gamification & Tournament Platform', {
    x: 1.3,
    y: 2.6,
    w: 7.4,
    h: 0.4,
    fontFace: 'Segoe UI',
    fontSize: 16,
    color: THEME.blue,
  });

  // Description block
  s.addText(
    'A complete walkthrough of system operations, daily tournament workflows, gamification engines, and technical architecture for the HCC Team.',
    {
      x: 1.3,
      y: 3.1,
      w: 7.4,
      h: 0.6,
      fontFace: 'Segoe UI',
      fontSize: 12,
      color: THEME.textMuted,
    }
  );

  // Bottom Meta Badge
  s.addText('Verified Backend Audit  │  November 2026  │  Production 1.0.0', {
    x: 1.3,
    y: 4.1,
    w: 7.4,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 10,
    color: THEME.greenLight,
    bold: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2: Why We Built It
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Why We Built HCC AutoEngage', 'PROBLEM & PURPOSE');

  // 3 Cards: Problem, Solution, Impact
  const cols = [
    {
      title: 'The Challenge',
      badge: 'COMMUNITY INACTIVITY',
      color: 'EF4444',
      items: [
        'Discord servers experience severe drops in activity between big hackathons.',
        'Manual quiz hosting and score calculation burns out volunteer team members.',
        'Active learners lack day-to-day incentives to stay consistently engaged.',
      ],
    },
    {
      title: 'Our Solution',
      badge: 'AUTOMATED ENGAGEMENT',
      color: THEME.green,
      items: [
        'Zero-touch daily quizzes drop automatically every morning at 09:00 AM IST.',
        'Instant self-grading via interactive Discord buttons and PostgreSQL RPC.',
        'Multi-dimensional tracking: learning, discussions, voice study, and peer help.',
      ],
    },
    {
      title: 'Community Value',
      badge: 'SUSTAINED GROWTH',
      color: THEME.blue,
      items: [
        'Creates an addictive daily habit: 10 rapid questions build continuous streaks.',
        'Transparent leaderboards spark healthy campus competition across all tiers.',
        'Eliminates organizer burnout with 100% automated weekly digests & awards.',
      ],
    },
  ];

  cols.forEach((col, i) => {
    const x = 0.8 + i * 2.9;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.6,
      w: 2.65,
      h: 3.4,
      fill: { color: THEME.cardBg },
      line: { color: col.color, width: 1 },
      rectRadius: 0.08,
    });

    s.addText(col.badge, {
      x: x + 0.2,
      y: 1.8,
      w: 2.25,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 9,
      bold: true,
      color: col.color,
    });

    s.addText(col.title, {
      x: x + 0.2,
      y: 2.05,
      w: 2.25,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 16,
      bold: true,
      color: THEME.textLight,
    });

    col.items.forEach((item, idx) => {
      s.addText(`• ${item}`, {
        x: x + 0.2,
        y: 2.5 + idx * 0.75,
        w: 2.25,
        h: 0.65,
        fontFace: 'Segoe UI',
        fontSize: 10,
        color: THEME.textMuted,
        valign: 'top',
      });
    });
  });

  addFooter(s, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3: How Members Interact With the Bot
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Member Experience & Slash Commands', 'MEMBER INTERFACE');

  // Left side: Primary commands list
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 4.8,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Core Member Commands', {
    x: 1.1,
    y: 1.8,
    w: 4.2,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.green,
  });
  

  const commands = [
    { cmd: '/quiz today', desc: 'Jump directly into today\'s daily challenge session' },
    { cmd: '/quiz stats', desc: 'View personal accuracy percentage and submission history' },
    { cmd: '/profile [user]', desc: 'Check level, XP progress bar, badges, and streak' },
    { cmd: '/leaderboard', desc: 'Interactive rankings: Weekly, Monthly, and All-Time' },
    { cmd: '/engagement me', desc: 'View 30-day breakdown of learning vs discussions' },
    { cmd: '/engagement thank', desc: 'Reward a helpful peer with +5 points & +10 XP' },
  ];

  commands.forEach((c, idx) => {
    s.addText(c.cmd, {
      x: 1.1,
      y: 2.15 + idx * 0.44,
      w: 1.8,
      h: 0.35,
      fontFace: 'Consolas',
      fontSize: 10.5,
      bold: true,
      color: THEME.blue,
    });
    s.addText(c.desc, {
      x: 2.8,
      y: 2.15 + idx * 0.44,
      w: 2.6,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    });
  });

  // Right side: Interactive Workflow Card
  s.addShape(pptx.ShapeType.rect, {
    x: 5.8,
    y: 1.6,
    w: 3.4,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.green, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Interactive Experience Flow', {
    x: 6.05,
    y: 1.8,
    w: 2.9,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.textLight,
  });

  const steps = [
    { step: '1. Ping & Alert', detail: 'Members receive notification in #daily-quiz.' },
    { step: '2. Button Submissions', detail: 'Click private buttons [A] [B] [C] [D].' },
    { step: '3. Instant Feedback', detail: 'Ephemeral response reveals explanation & XP.' },
    { step: '4. Session Podium', detail: 'Top 3 scorers celebrated in the channel.' },
  ];

  steps.forEach((st, idx) => {
    s.addText(st.step, {
      x: 6.05,
      y: 2.2 + idx * 0.65,
      w: 2.9,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      color: THEME.greenLight,
    });
    s.addText(st.detail, {
      x: 6.05,
      y: 2.45 + idx * 0.65,
      w: 2.9,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    });
  });

  addFooter(s, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4: How the Quiz System Works
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, '7-Day Challenge Engine & Question Timers', 'TOURNAMENT ENGINE');

  // 4 Workflow Cards horizontally
  const phases = [
    {
      num: '01',
      title: 'Announcement',
      time: '09:00 AM IST',
      bullets: [
        'Discord ping in quiz channel',
        '30-second live countdown timer',
        'Today\'s topic & stakes revealed',
      ],
    },
    {
      num: '02',
      title: 'Sequential Drops',
      time: '10 Questions',
      bullets: [
        '15s answering window per Q',
        'Syntax-highlighted code snippet',
        'Fair private button choices',
      ],
    },
    {
      num: '03',
      title: 'Instant Close',
      time: 'Anti-Cheat Lock',
      bullets: [
        'DB status locked to closed',
        'Late submissions auto-rejected',
        'Correct answer highlighted green',
      ],
    },
    {
      num: '04',
      title: 'Session Podium',
      time: 'Automated Finale',
      bullets: [
        'Live podium 🥇 🥈 🥉',
        'Top 10 scores calculated',
        'Streaks & XP locked into profiles',
      ],
    },
  ];

  phases.forEach((p, i) => {
    const x = 0.8 + i * 2.15;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.6,
      w: 2.0,
      h: 3.4,
      fill: { color: THEME.cardBg },
      line: { color: THEME.cardBorder, width: 1 },
      rectRadius: 0.08,
    });

    s.addText(p.num, {
      x: x + 0.15,
      y: 1.75,
      w: 1.7,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 18,
      bold: true,
      color: THEME.green,
    });

    s.addText(p.title, {
      x: x + 0.15,
      y: 2.1,
      w: 1.7,
      h: 0.3,
      fontFace: 'Segoe UI',
      fontSize: 12,
      bold: true,
      color: THEME.textLight,
    });

    s.addText(p.time, {
      x: x + 0.15,
      y: 2.38,
      w: 1.7,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 9,
      bold: true,
      color: THEME.blue,
    });

    p.bullets.forEach((b, idx) => {
      s.addText(`• ${b}`, {
        x: x + 0.15,
        y: 2.75 + idx * 0.6,
        w: 1.7,
        h: 0.55,
        fontFace: 'Segoe UI',
        fontSize: 9,
        color: THEME.textMuted,
        valign: 'top',
      });
    });
  });

  addFooter(s, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5: Points, XP and Levels
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Gamification: Points, XP & Progression', 'GAMIFICATION');

  // Left card: Points vs XP
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 4.0,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Two-Tier Economy', {
    x: 1.05,
    y: 1.8,
    w: 3.5,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.green,
  });

  s.addText('🎁  Competition Points', {
    x: 1.05,
    y: 2.2,
    w: 3.5,
    h: 0.25,
    fontFace: 'Segoe UI',
    fontSize: 11,
    bold: true,
    color: THEME.textLight,
  });
  s.addText(
    '• Awarded for correct answers (+10 pts per question).\n• Dynamic balance used for Weekly & Monthly leaderboards.\n• Resets periodically to give newcomers a fair shot.',
    {
      x: 1.05,
      y: 2.45,
      w: 3.5,
      h: 0.7,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    }
  );

  s.addText('⭐  Experience Points (XP)', {
    x: 1.05,
    y: 3.25,
    w: 3.5,
    h: 0.25,
    fontFace: 'Segoe UI',
    fontSize: 11,
    bold: true,
    color: THEME.textLight,
  });
  s.addText(
    '• Lifetime progression indicator that NEVER resets.\n• +20 XP for correct answers; +5 XP for participation.\n• Directly governs Member Level & Profile Badges.',
    {
      x: 1.05,
      y: 3.5,
      w: 3.5,
      h: 0.7,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    }
  );

  // Right card: Level Curve & Tiers
  s.addShape(pptx.ShapeType.rect, {
    x: 5.1,
    y: 1.6,
    w: 4.1,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Level Curve & Tiers', {
    x: 5.35,
    y: 1.8,
    w: 3.6,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.blue,
  });

  s.addText('Formula:  Level = 1 + floor( sqrt(XP / 50) )', {
    x: 5.35,
    y: 2.15,
    w: 3.6,
    h: 0.3,
    fontFace: 'Consolas',
    fontSize: 10,
    color: THEME.greenLight,
    bold: true,
  });

  const tiers = [
    { tier: '🌱 Rookie / ✨ Learner', req: 'Levels 1–2 (0–199 XP)', color: THEME.textMuted },
    { tier: '🌟 Rising Contender', req: 'Levels 3–4 (200–799 XP)', color: THEME.greenLight },
    { tier: '⚡ Expert Scholar', req: 'Levels 5–6 (800–1,799 XP)', color: THEME.gold },
    { tier: '🔮 Master of Code', req: 'Levels 7–9 (1,800–3,999 XP)', color: THEME.purple },
    { tier: '💎 Diamond Grandmaster', req: 'Level 10+ (4,000+ XP)', color: THEME.blue },
  ];

  tiers.forEach((t, idx) => {
    s.addText(t.tier, {
      x: 5.35,
      y: 2.55 + idx * 0.44,
      w: 2.0,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      bold: true,
      color: t.color,
    });
    s.addText(t.req, {
      x: 7.2,
      y: 2.55 + idx * 0.44,
      w: 1.8,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 9,
      color: THEME.textMuted,
      align: 'right',
    });
  });

  addFooter(s, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6: Profiles, Streaks and Achievements
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Profiles, Daily Streaks & Badges', 'ENGAGEMENT MECHANICS');

  // Left card: Streaks Engine
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 4.0,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Daily Streak Multipliers', {
    x: 1.05,
    y: 1.8,
    w: 3.5,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.gold,
  });

  s.addText(
    'Members build streaks by submitting daily challenge answers. Fire intensity grows as participation continues:',
    {
      x: 1.05,
      y: 2.15,
      w: 3.5,
      h: 0.5,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    }
  );

  const streaks = [
    { label: '🔥  1–2 Days', detail: 'Starter Streak' },
    { label: '🔥🔥  3–6 Days', detail: 'On Fire!' },
    { label: '🔥🔥🔥  7+ Days', detail: 'Unstoppable Momentum' },
    { label: '👑  30+ Days', detail: 'Legendary Dedication' },
  ];

  streaks.forEach((st, idx) => {
    s.addText(st.label, {
      x: 1.05,
      y: 2.75 + idx * 0.42,
      w: 1.8,
      h: 0.3,
      fontFace: 'Segoe UI',
      fontSize: 10,
      bold: true,
      color: THEME.textLight,
    });
    s.addText(st.detail, {
      x: 2.7,
      y: 2.75 + idx * 0.42,
      w: 1.8,
      h: 0.3,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    });
  });

  s.addText('⏰ 48-Hour Grace Period: Streaks auto-reset at 03:00 AM if inactive for 48h.', {
    x: 1.05,
    y: 4.45,
    w: 3.5,
    h: 0.35,
    fontFace: 'Segoe UI',
    fontSize: 8.5,
    color: THEME.greenLight,
  });

  // Right card: 8 Dynamic Achievements
  s.addShape(pptx.ShapeType.rect, {
    x: 5.1,
    y: 1.6,
    w: 4.1,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('8 Dynamic Achievement Badges', {
    x: 5.35,
    y: 1.8,
    w: 3.6,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.green,
  });

  const badges = [
    { badge: '🎯 First Blood', hint: 'Submit your 1st quiz attempt' },
    { badge: '📅 Consistent', hint: 'Complete 5 daily quizzes' },
    { badge: '🧠 Quiz Master', hint: 'Win 10 quizzes with full score' },
    { badge: '🔥 On Fire', hint: 'Build a 3-day active streak' },
    { badge: '⚡ Unstoppable', hint: 'Build a 7-day tournament streak' },
    { badge: '🌟 Century Club', hint: 'Accumulate 100+ total XP' },
    { badge: '🏆 Points Elite', hint: 'Accumulate 100+ total points' },
    { badge: '💎 Elite Scholar', hint: 'Reach Level 5 or higher' },
  ];

  badges.forEach((b, idx) => {
    s.addText(b.badge, {
      x: 5.35,
      y: 2.15 + idx * 0.34,
      w: 1.8,
      h: 0.28,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      bold: true,
      color: THEME.textLight,
    });
    s.addText(b.hint, {
      x: 7.0,
      y: 2.15 + idx * 0.34,
      w: 2.0,
      h: 0.28,
      fontFace: 'Segoe UI',
      fontSize: 8.5,
      color: THEME.textMuted,
      align: 'right',
    });
  });

  addFooter(s, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7: Leaderboards and Competition
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Multi-Dimensional Community Scoring', 'LEADERBOARDS & RANKINGS');

  // 5 Engagement Pillars
  const pillars = [
    { pct: '40%', name: 'Learning & Quizzes', desc: 'Daily challenges, coding problems, technical quizzes.' },
    { pct: '25%', name: 'Discussions', desc: 'Meaningful chat messages (45s cooldown, 50 pt daily cap).' },
    { pct: '15%', name: 'Voice Study', desc: 'Voice channel study sessions (10s min, auto-AFK pause).' },
    { pct: '10%', name: 'Reactions', desc: 'Supportive emoji reactions (15s cooldown, 20 pt cap).' },
    { pct: '10%', name: 'Contributions', desc: 'Peer `/engagement thank` and verified moderator awards.' },
  ];

  pillars.forEach((p, idx) => {
    const y = 1.6 + idx * 0.58;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y,
      w: 5.0,
      h: 0.5,
      fill: { color: THEME.cardBg },
      line: { color: THEME.cardBorder, width: 1 },
      rectRadius: 0.05,
    });

    s.addText(p.pct, {
      x: 0.95,
      y: y + 0.08,
      w: 0.7,
      h: 0.34,
      fontFace: 'Segoe UI',
      fontSize: 13,
      bold: true,
      color: THEME.green,
    });

    s.addText(p.name, {
      x: 1.65,
      y: y + 0.05,
      w: 2.0,
      h: 0.22,
      fontFace: 'Segoe UI',
      fontSize: 10,
      bold: true,
      color: THEME.textLight,
    });
    s.addText(p.desc, {
      x: 1.65,
      y: y + 0.26,
      w: 4.0,
      h: 0.2,
      fontFace: 'Segoe UI',
      fontSize: 8.5,
      color: THEME.textMuted,
    });
  });

  // Right card: Leaderboard Views
  s.addShape(pptx.ShapeType.rect, {
    x: 6.1,
    y: 1.6,
    w: 3.1,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.green, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Interactive /leaderboard', {
    x: 6.3,
    y: 1.8,
    w: 2.7,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 13,
    bold: true,
    color: THEME.textLight,
  });

  const views = [
    { title: '⚡ Weekly View', desc: 'Points accumulated in the last 7 days. Highlights current top competitors.' },
    { title: '📅 Monthly Championship', desc: 'Cumulative score for the month. Decides monthly prize recipients.' },
    { title: '🏆 Hall of Fame', desc: 'All-time cumulative points and XP since server inception.' },
  ];

  views.forEach((v, idx) => {
    s.addText(v.title, {
      x: 6.3,
      y: 2.2 + idx * 0.85,
      w: 2.7,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      color: THEME.blue,
    });
    s.addText(v.desc, {
      x: 6.3,
      y: 2.45 + idx * 0.85,
      w: 2.7,
      h: 0.55,
      fontFace: 'Segoe UI',
      fontSize: 9,
      color: THEME.textMuted,
    });
  });

  addFooter(s, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8: Automated Operations
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, '24/7 Automated Operations & Cron Jobs', 'AUTOMATION');

  const jobs = [
    {
      time: '09:00 AM IST',
      title: 'Daily Challenge Drop',
      desc: 'Posts announcement, triggers countdown, and drops sequential questions.',
    },
    {
      time: '03:00 AM IST',
      title: 'Streak Maintenance',
      desc: 'Scans all members; resets streaks inactive for >48 hours to ensure integrity.',
    },
    {
      time: '23:59 PM IST',
      title: 'Daily Quiz Auto-Close',
      desc: 'Closes any lingering open quizzes so answers cannot be submitted overnight.',
    },
    {
      time: 'Sun 21:00 IST',
      title: 'Weekly Community Digest',
      desc: 'Publishes official Weekly Digest, takes DB snapshot, and honors top members.',
    },
    {
      time: '1st 00:05 IST',
      title: 'Monthly Winner Crowning',
      desc: 'Computes monthly champions, logs records to monthly_rewards table.',
    },
    {
      time: 'Every 5 Mins',
      title: '24/7 Keep-Alive Heartbeat',
      desc: 'Self-pings HTTP health server and Supabase pool to prevent container sleeping.',
    },
  ];

  jobs.forEach((j, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.8 + col * 4.3;
    const y = 1.6 + row * 1.15;

    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 4.1,
      h: 1.0,
      fill: { color: THEME.cardBg },
      line: { color: THEME.cardBorder, width: 1 },
      rectRadius: 0.06,
    });

    s.addText(j.time, {
      x: x + 0.15,
      y: y + 0.12,
      w: 1.4,
      h: 0.22,
      fontFace: 'Consolas',
      fontSize: 9,
      bold: true,
      color: THEME.green,
    });

    s.addText(j.title, {
      x: x + 1.5,
      y: y + 0.1,
      w: 2.45,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      color: THEME.textLight,
    });

    s.addText(j.desc, {
      x: x + 0.15,
      y: y + 0.38,
      w: 3.8,
      h: 0.55,
      fontFace: 'Segoe UI',
      fontSize: 8.5,
      color: THEME.textMuted,
    });
  });

  addFooter(s, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9: Admin Capabilities
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Administrative Controls & Governance', 'ADMINISTRATION');

  const adminCategories = [
    {
      title: 'Quiz Management',
      badge: 'TOURNAMENT CONTROL',
      color: THEME.green,
      cmds: [
        { name: '/admin quiz publish', desc: 'Drop daily quiz immediately for testing' },
        { name: '/admin quiz close', desc: 'Force-close active quiz in emergencies' },
      ],
    },
    {
      title: 'Score Adjustments',
      badge: 'MANUAL OVERRIDES',
      color: THEME.gold,
      cmds: [
        { name: '/admin points grant', desc: 'Add or deduct points/XP with audit reason' },
        { name: '/admin streak reset', desc: 'Reset member streak in case of exploit' },
      ],
    },
    {
      title: 'Honors & Channels',
      badge: 'SERVER CONFIG',
      color: THEME.blue,
      cmds: [
        { name: '/admin announce weekly', desc: 'Trigger weekly digest announcement' },
        { name: '/admin engagement channels', desc: 'Set channel multipliers (1.5x / 0x)' },
      ],
    },
  ];

  adminCategories.forEach((cat, idx) => {
    const x = 0.8 + idx * 2.9;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.6,
      w: 2.65,
      h: 3.4,
      fill: { color: THEME.cardBg },
      line: { color: cat.color, width: 1 },
      rectRadius: 0.08,
    });

    s.addText(cat.badge, {
      x: x + 0.15,
      y: 1.8,
      w: 2.35,
      h: 0.22,
      fontFace: 'Segoe UI',
      fontSize: 8.5,
      bold: true,
      color: cat.color,
    });

    s.addText(cat.title, {
      x: x + 0.15,
      y: 2.05,
      w: 2.35,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 14,
      bold: true,
      color: THEME.textLight,
    });

    cat.cmds.forEach((c, cIdx) => {
      s.addText(c.name, {
        x: x + 0.15,
        y: 2.55 + cIdx * 1.0,
        w: 2.35,
        h: 0.25,
        fontFace: 'Consolas',
        fontSize: 9.5,
        bold: true,
        color: THEME.textLight,
      });
      s.addText(c.desc, {
        x: x + 0.15,
        y: 2.82 + cIdx * 1.0,
        w: 2.35,
        h: 0.6,
        fontFace: 'Segoe UI',
        fontSize: 9,
        color: THEME.textMuted,
      });
    });
  });

  addFooter(s, 9);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10: Technology Behind the Bot
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Architecture: Node.js, Discord & Supabase', 'TECH STACK');

  const stack = [
    {
      layer: 'Application Layer',
      tech: 'Node.js LTS (ESM) & discord.js v14',
      details: [
        'Modular command & event discovery loader',
        'Built with WebSocket shard & gateway reconnect listeners',
        'Zero-downtime health server on port 8080 (/health, /ping)',
      ],
    },
    {
      layer: 'Database Layer',
      tech: 'Supabase (PostgreSQL with RLS)',
      details: [
        '15 normalized tables & immutable points ledger',
        'Atomic stored procedures guarantee zero duplicate submissions',
        'Row Level Security policies protect member & score privacy',
      ],
    },
    {
      layer: 'Hosting & Deployment',
      tech: 'Docker Container on Railway',
      details: [
        'Alpine Linux container with native tzdata (Asia/Kolkata)',
        'Automatic container restart policy (restartPolicyType: ALWAYS)',
        'PM2 process management with memory thresholds and log rotate',
      ],
    },
  ];

  stack.forEach((st, idx) => {
    const y = 1.6 + idx * 1.15;
    s.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y,
      w: 8.4,
      h: 1.0,
      fill: { color: THEME.cardBg },
      line: { color: THEME.cardBorder, width: 1 },
      rectRadius: 0.08,
    });

    s.addText(st.layer.toUpperCase(), {
      x: 1.05,
      y: y + 0.15,
      w: 2.2,
      h: 0.22,
      fontFace: 'Segoe UI',
      fontSize: 9,
      bold: true,
      color: THEME.green,
    });

    s.addText(st.tech, {
      x: 1.05,
      y: y + 0.38,
      w: 2.5,
      h: 0.45,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      color: THEME.textLight,
    });

    st.details.forEach((d, dIdx) => {
      s.addText(`• ${d}`, {
        x: 3.7,
        y: y + 0.12 + dIdx * 0.28,
        w: 5.3,
        h: 0.25,
        fontFace: 'Segoe UI',
        fontSize: 9,
        color: THEME.textMuted,
      });
    });
  });

  addFooter(s, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 11: Current Development Status
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Verified Feature Status & Audit Findings', 'STATUS & AUDIT');

  const categories = [
    {
      title: '🟢 Implemented & Verified',
      color: THEME.green,
      items: [
        'Core bot gateway, command loader & health endpoint',
        '7-day calendar mapped with 70 curated questions',
        '30-second start countdown with relative timestamp',
        'Atomic answer grading & points history ledger',
        'Interactive profile, badges, and /leaderboard',
      ],
    },
    {
      title: '🟡 Implemented; Needs Staging Tuning',
      color: THEME.gold,
      items: [
        'Question timer: banks specify 15s; fallback in code is 20s',
        '@everyone pings: code sends 2 pings (Start + Wrap-up)',
        'Full 10-question run with live concurrent members',
        'Multi-channel voice tracking under mass reconnects',
      ],
    },
    {
      title: '⚪ Planned for Future Updates',
      color: THEME.blue,
      items: [
        'Automated Discord role assignment on Level Up',
        'Public web-based live leaderboard dashboard',
        'Streak freeze & participation recovery power-ups',
        'Automated certificate generation for monthly winners',
      ],
    },
  ];

  categories.forEach((cat, idx) => {
    const x = 0.8 + idx * 2.9;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.6,
      w: 2.65,
      h: 3.4,
      fill: { color: THEME.cardBg },
      line: { color: cat.color, width: 1 },
      rectRadius: 0.08,
    });

    s.addText(cat.title, {
      x: x + 0.15,
      y: 1.8,
      w: 2.35,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      color: cat.color,
    });

    cat.items.forEach((item, iIdx) => {
      s.addText(`• ${item}`, {
        x: x + 0.15,
        y: 2.25 + iIdx * 0.58,
        w: 2.35,
        h: 0.52,
        fontFace: 'Segoe UI',
        fontSize: 8.5,
        color: THEME.textMuted,
        valign: 'top',
      });
    });
  });

  addFooter(s, 11);
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 12: What's Coming Next & Member Guide
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.background = { color: THEME.bg };
  addHeader(s, 'Next Steps: Competition Launch & Roadmap', 'ROADMAP');

  // Left card: Member Expectations for Tournament
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.6,
    w: 4.0,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.green, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('What Members Need to Know', {
    x: 1.05,
    y: 1.8,
    w: 3.5,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.green,
  });

  const memberGuide = [
    { q: 'Where do I participate?', a: 'In the designated #daily-quiz channel.' },
    { q: 'When do quizzes drop?', a: 'Every morning at 09:00 AM IST sharp.' },
    { q: 'How many questions?', a: '10 questions per day, 15 seconds each.' },
    { q: 'How are prizes awarded?', a: 'Based on cumulative points on the Monthly Leaderboard.' },
  ];

  memberGuide.forEach((mg, idx) => {
    s.addText(mg.q, {
      x: 1.05,
      y: 2.2 + idx * 0.65,
      w: 3.5,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 10,
      bold: true,
      color: THEME.textLight,
    });
    s.addText(mg.a, {
      x: 1.05,
      y: 2.45 + idx * 0.65,
      w: 3.5,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 9,
      color: THEME.textMuted,
    });
  });

  // Right card: Launch Checklist
  s.addShape(pptx.ShapeType.rect, {
    x: 5.1,
    y: 1.6,
    w: 4.1,
    h: 3.4,
    fill: { color: THEME.cardBg },
    line: { color: THEME.cardBorder, width: 1 },
    rectRadius: 0.08,
  });

  s.addText('Immediate Launch Checklist', {
    x: 5.35,
    y: 1.8,
    w: 3.6,
    h: 0.3,
    fontFace: 'Segoe UI',
    fontSize: 14,
    bold: true,
    color: THEME.blue,
  });

  const roadmap = [
    '1. Set QUIZ_QUESTION_TIME_SECONDS=15 in production Railway env.',
    '2. Confirm production Discord channel IDs in .env variables.',
    '3. Run a final staging simulation in #autoengage-testing.',
    '4. Announce tournament rules and schedule to server members.',
    '5. Launch Day 1 Challenge (Python Basics) on Nov 9, 2026 @ 09:00 AM IST.',
  ];

  roadmap.forEach((r, idx) => {
    s.addText(r, {
      x: 5.35,
      y: 2.25 + idx * 0.52,
      w: 3.6,
      h: 0.45,
      fontFace: 'Segoe UI',
      fontSize: 9.5,
      color: THEME.textMuted,
    });
  });

  addFooter(s, 12);
}

// ─── Save Presentation ────────────────────────────────────────────────────────
console.log('Generating PowerPoint presentation...');
pptx
  .writeFile({ fileName: OUTPUT_PATH })
  .then(() => {
    console.log(`Presentation generated successfully at: ${OUTPUT_PATH}`);
  })
  .catch((err) => {
    console.error('Error writing presentation:', err);
    process.exit(1);
  });

