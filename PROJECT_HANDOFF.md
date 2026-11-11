# HCC-AutoEngage: Project Handoff & Architecture Guide

> **Document Version:** 1.0.0  
> **Target Date:** November 11, 2026  
> **Maintainer:** `raju-2313` (`kumbharraju784@gmail.com`)  
> **Repository:** `https://github.com/raju-2313/HCC-AutoEngage.git`

---

## 1. Project Overview

**HCC-AutoEngage** is the automated Discord community engagement and gamification engine for the **HackerRank Campus Crew (HCC)**. Its flagship feature is the **7-Day Daily Tech Challenge Sprint** running from **November 9 to November 15, 2026**.

* **Runtime Environment:** Cloud-hosted container on **Railway** (24/7 keep-alive).
* **Database:** **Supabase (PostgreSQL)** with atomic RPC procedures (`submit_quiz_attempt`).
* **Discord Integration:** `discord.js` v14 with slash commands, interactive buttons, and ephemeral responses.

---

## 2. Infrastructure & Credentials

### Cloud Deployments
* **Railway:** Automatically watches and deploys from `origin/main` on GitHub (`raju-2313/HCC-AutoEngage`).
* **Supabase:** Houses member profiles, points, XP, streaks, quiz definitions, questions, and attempt logs.

### Key Discord Channels
* **Main Quiz / Discussion Channel (`#💬・general`):** `1538470672722952303`
  * *Purpose:* Public home for daily challenge drops, announcements, and final podiums.
* **Testing Channel (`#autoengage-testing`):** `1567916304118063124`
  * *Purpose:* Isolated sandbox for test sessions and health checks.

### Git Identity
* **User Name:** `raju-2313`
* **User Email:** `kumbharraju784@gmail.com`
* *Note:* All 67+ repository commits are credited to this GitHub identity to ensure full contribution graph tracking.

---

## 3. 7-Day Sprint Calendar & Schedule

All remaining challenges trigger automatically at **19:00:00 IST (07:00 PM)**.

| Date | Day | Topic | Category & Syntax | Status |
| :--- | :---: | :--- | :--- | :--- |
| **Nov 9** | Day 1 | Python Basics | `python` | Completed |
| **Nov 10** | Day 2 | C Programming Basics | `c` | Completed (21 participants) |
| **Nov 11** | **Day 3** | **Loops & Iterations** | `python` | **Active / Scheduled @ 19:00 IST** |
| **Nov 12** | Day 4 | Conditionals & Logic | `python` / logic | Scheduled @ 19:00 IST |
| **Nov 13** | Day 5 | Git & GitHub | `bash` | Scheduled @ 19:00 IST |
| **Nov 14** | Day 6 | HTML & Web Foundations | `html` | Scheduled @ 19:00 IST |
| **Nov 15** | Day 7 | Tech & Computer Basics | plain / CS | Scheduled @ 19:00 IST (Grand Finale) |

> **Morning Quiet Hours:** There are **zero tasks** scheduled at 09:00 AM IST. The bot remains in keep-alive mode until 19:00 IST.

---

## 4. Daily Challenge Execution Lifecycle (19:00 IST)

The automated sequence inside `src/services/quiz/dailyTimedSessionEngine.js` follows three distinct phases:

```
19:00:00 IST  ───▶  Phase 1: Warmup Announcement (@everyone Ping 1 of 2)
                    • 30-Second Countdown with dynamic relative timestamp: <t:...:R>
                    • Displays Day #, Topic, 10 Questions, +10 pts & +20 XP rewards
                    • Initializes session in Supabase (status: 'in_progress')

19:00:30 IST  ───▶  Phase 2: 10 Rapid-Fire Questions (Zero Pings)
                    • 15 Seconds Timer per Question (synchronized via <t:expiry:R>)
                    • Language-specific markdown syntax highlighting in code snippets
                    • 4 Interactive Buttons (Option A, B, C, D)
                    • Ephemeral feedback: Only the clicking student sees their result
                    • Exact 15s lock: Buttons disable & Green Answer Reveal embed appears
                    • 5-Second intermission before the next question drops

~19:04:15 IST ───▶  Phase 3: Championship Wrap-up (@everyone Ping 2 of 2)
                    • Top 3 Podium (Champion 🥇, Runner-Up 🥈, 3rd Place 🥉)
                    • Session Leaderboard (Top 10) with points and accuracy
                    • Standalone "Whispers from the Mod" hint card (Zero Pings)
                    • Locks all points, XP, and streaks into Supabase (status: 'completed')
```

---

## 5. Critical Fixes Implemented

1. **`ReferenceError: now is not defined` (Fixed in commit `15b6437`)**:
   * Restored `const now = Date.now();` inside the question loop in `dailyTimedSessionEngine.js`.
2. **Last-Second Tap Race Condition (Fixed in commit `b595c8e`)**:
   * In `attempts.js` and `quizService.js`, late clicks (arriving after the question closed in DB) are caught as `QUIZ_EXPIRED`.
   * Instead of a generic error message, the user receives an informative private card explaining they tapped a fraction of a second too late and advising to tap with ~3s remaining.
3. **Smart Language Snippet Highlighting (Fixed in commit `19674c6`)**:
   * Uses `getSnippetLanguage(category, snippet)` to ensure Python, C, Bash, and HTML blocks format with correct Discord syntax coloring.
4. **User Commands Privacy**:
   * All user-facing commands (`/profile`, `/leaderboard`, `/engagement me`, `/quiz stats`, etc.) use `MessageFlags.Ephemeral` so results are private to the caller and keep channels clean.

---

## 6. Project Directory Structure

```
HCC-AutoEngage/
├── .github/workflows/          # CI and Dependabot workflows
├── migrations/                 # PostgreSQL database schemas
├── src/
│   ├── bot/
│   │   └── client.js           # Discord client bootstrap & intent configuration
│   ├── commands/               # Slash command handlers (/profile, /leaderboard, /quiz, /admin, /purge)
│   ├── config/
│   │   └── index.js            # Central environment variables & channel ID resolution
│   ├── database/
│   │   ├── client.js           # Supabase client instantiation
│   │   └── queries/            # Data access layer (attempts, members, quizzes, quizSessions)
│   ├── data/question-banks/    # Curated JSON question sets for Days 1–7
│   ├── events/                 # Discord gateway event handlers (interactionCreate, ready)
│   ├── scripts/                # Diagnostic, testing, and manual run utilities
│   ├── services/
│   │   ├── automation/         # scheduler.js (node-cron daily drops at 19:00 IST)
│   │   ├── quiz/               # dailyTimedSessionEngine.js, quizService.js, sessionQuestionManager.js
│   │   └── recognition/        # engagementScoringService.js, weeklyAnnouncementService.js
│   └── utils/                  # logger.js, embeds.js, leaderboardTips.js
├── .env                        # Local environment secrets (DO NOT COMMIT)
├── .env.example                # Documented configuration template
├── Dockerfile                  # Production container definition
├── package.json                # Dependencies and project scripts
└── PROJECT_HANDOFF.md          # This documentation file
```

---

## 7. Instructions for Opening in a New Workspace / Drive

When moving this folder to another disk (e.g., `D:\HCC-AutoEngage`):

1. **Verify Hidden Files**: Ensure `.env` and `.git/` were transferred successfully.
2. **Open in VS Code**: `File ➜ Open Folder...` and select the new location.
3. **Verify Dependencies**:
   ```bash
   npm install
   ```
4. **Verify Git Credentials**:
   ```bash
   git config user.name   # Should return: raju-2313
   git config user.email  # Should return: kumbharraju784@gmail.com
   git status             # Should be clean and on branch main
   ```
5. **Quick Verification Script**:
   ```bash
   node -e "import('./src/services/quiz/sessionQuestionManager.js').then(m => console.log('Ready for Day', m.getDayQuestionSet('2026-11-11').meta.dayNumber))"
   ```
   *(Expected output: `Ready for Day 3`)*

---

*Handoff complete. The automated engine on Railway is self-sufficient and will execute all remaining days automatically at 19:00 IST.*
