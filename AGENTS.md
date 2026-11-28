# AGENTS.md — HCC-AutoEngage AI Agent Guide & State of the Project

> **Single Source of Truth for all AI coding agents (Claude Code, Cursor, Copilot, Codex, Windsurf, Aider, Antigravity, etc.)**  
> **Last Updated:** November 28, 2026  
> **Repository:** `https://github.com/raju-2313/HCC-AutoEngage.git`  
> **Active Branch:** `main` (auto-deploys to Railway container)  
> **Maintainer:** `raju-2313` (`kumbharraju784@gmail.com`)

---

## 1. Project Overview & Architecture

**HCC-AutoEngage** is a 24/7 automated Discord bot engine built for the **HackerRank Campus Crew (HCC)**. It handles automated daily learning drops, timed competitive quiz challenges with real-time countdowns, gamification XP & points scoring, leaderboard snapshots, and engagement analytics.

### Tech Stack
- **Runtime:** Node.js (v20+ / v26 ESM, `"type": "module"`)
- **Discord Framework:** `discord.js` (v14) with Gateway Intents (Guilds, Messages, Reactions, Members, Voice)
- **Database:** Supabase (PostgreSQL with Row Level Security & service role admin client)
- **Deployment / Hosting:** Railway container deployment synced to GitHub `main` branch
- **Scheduler:** `node-cron` strictly locked to **Asia/Kolkata (IST)** timezone
- **HTTP Server:** Fastify / native HTTP health check server for keep-alive pings on port `PORT || 8080`

---

## 2. Current Project State (Live Progress)

### Completed Milestones
1. **Phase 1 7-Day Sprint Testing (Nov 9 – Nov 15, 2026):** Finished and archived. 30 participants, 639 submissions, podium awarded.
2. **Phase 2 — 15-Day Git & GitHub Learning Programme:** Fully engineered, audited, tested, and staged for launch.
   - **Content:** All 15 days generated and verified in `learning-content/git-github/day-01/` to `day-15/` (150 quiz questions, daily practical tasks, morning announcement cards).
   - **Launch Date:** **Monday, November 30, 2026 at 09:00 AM IST**.
   - **Automation State:** Live (`AUTOMATION_SUSPENDED = false` in `src/services/automation/scheduler.js`).
   - **Slash Commands:** `/learning progress` (ephemeral member scorecard) and `/learning admin-drop` (admin manual trigger/testing).
   - **Interactive Teaser:** Teaser message posted live in `#💬・general` (`1538470672722952303`) with interactive buttons (`sprint_im_in`, `sprint_remind_me`) returning private ephemeral confirmations.
   - **Database Status:** `git_learning_progress` Supabase table migrated (`migrations/006_git_learning_programme.sql`) and verified clean (0 rows) ready for Monday.
   - **Code Quality:** All 109 JS files pass `node --check` with 0 syntax errors.

---

## 3. Directory Layout & Key Entrypoints

```
HCC-AutoEngage/
├── AGENTS.md                          # Universal AI agent instructions (YOU ARE HERE)
├── PROJECT_HANDOFF.md                 # Human & team handoff reference
├── package.json                       # Dependencies & scripts ("type": "module")
├── .env                               # Local secrets (never commit)
├── .env.example                       # Documented environment template
├── Dockerfile                         # Production Railway Docker build
├── migrations/                        # SQL schema migrations (001 to 006)
│   └── 006_git_learning_programme.sql # Git learning tracking table
├── learning-content/
│   └── git-github/                    # 15 pre-compiled learning packages
│       ├── day-01/ ... day-15/        # Each day has: announcement, learning-card, practical-task, quiz-bank
│       └── Master_The_HCC_15-Day...mp4# Official promotional/walkthrough video
├── src/
│   ├── index.js                       # Primary process entrypoint
│   ├── bot/
│   │   ├── client.js                  # Discord Client setup & gateway intents
│   │   ├── commandLoader.js           # Dynamic slash command loader
│   │   └── eventLoader.js             # Dynamic event handler loader
│   ├── commands/                      # Slash command modules (/learning, /profile, /leaderboard, /quiz, /admin, etc.)
│   ├── config/index.js                # Central environment validator & channel resolver
│   ├── database/
│   │   ├── client.js                  # Supabase admin client initialization
│   │   └── queries/                   # Database query abstraction layer
│   │       ├── gitLearning.js         # Git learning progress CRUD
│   │       ├── members.js             # Member profiles, points, streaks
│   │       ├── quizzes.js             # Daily quiz records & questions
│   │       ├── quizSessions.js        # Timed live session state
│   │       └── leaderboard.js         # Snapshots and rankings
│   ├── events/
│   │   ├── interactionCreate.js       # Routes slash commands & button clicks (quiz, stickers, teaser)
│   │   ├── ready.js                   # Bot startup & scheduler initialization
│   │   ├── messageCreate.js           # Message XP / engagement tracking
│   │   └── messageReactionAdd.js      # Reaction XP tracking
│   ├── services/
│   │   ├── automation/
│   │   │   └── scheduler.js           # Central cron scheduler (Morning card, Evening quiz, Heartbeat)
│   │   ├── learning/
│   │   │   └── gitLearningManager.js  # Day calculation, payload builders, interactive progress
│   │   ├── quiz/
│   │   │   ├── dailyTimedSessionEngine.js # 10-question live timed quiz engine with countdown
│   │   │   └── quizService.js         # Quiz publishing & answer evaluation
│   │   └── recognition/               # Leaderboard scoring & weekly summaries
│   └── utils/
│       ├── logger.js                  # Structured Winston/console logger
│       └── embeds.js                  # Standardized branded embed builders
```

---

## 4. Operational Schedules (Asia/Kolkata IST)

All automated background cron jobs run inside `src/services/automation/scheduler.js`:

| Time (IST) | Job Name | Action | Channel |
|---|---|---|---|
| **09:00 AM** | `gitMorningAnnouncement` | Posts Day 1–15 morning concept card + practical task | `#💬・general` (`1538470672722952303`) |
| **07:00 PM (19:00)** | `gitEveningQuiz` | Launches 10-question timed live quiz (30s countdown + 15s/Q) | `#💬・general` (`1538470672722952303`) |
| **11:59 PM (23:59)** | `dailyClose` | Auto-closes any remaining open quiz | Database cleanup |
| **03:00 AM** | `streakMaintenance` | Resets inactive streaks (>48 hrs) | Database maintenance |
| **Every 5 mins** | `keepAlive` | HTTP self-ping & Supabase connection pool keep-alive | Local port 8080 / DB |

---

## 5. Verified Discord Channel IDs

| Channel Purpose | Discord Channel ID | Notes |
|---|---|---|
| **Main Quiz & General Discussion** | `1538470672722952303` | Primary production channel for quizzes, cards, and community interaction |
| **Official Announcements** | `1538470372918165587` | Admin weekly roundups and champion crowning |
| **Testing / Sandbox Channel** | `1567916304118063124` | Safety sandbox for dev testing (`TEST_CHANNEL_ID`) |
| **Discord Guild (Server) ID** | `1537136248001536040` | Official HCC Server |

---

## 6. Railway & Environment Variables Checklist

Every deployment on Railway requires these environment variables set in the Railway dashboard:

```env
NODE_ENV=production
TZ=Asia/Kolkata
PORT=8080

# Discord
DISCORD_TOKEN=<bot_token>
DISCORD_CLIENT_ID=<client_id>
DISCORD_GUILD_ID=1537136248001536040
DISCORD_QUIZ_CHANNEL_ID=1538470672722952303
TEST_CHANNEL_ID=1567916304118063124
ADMIN_ROLE_NAME=HCC Admin

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>

# Git & GitHub Programme Config
GIT_PROGRAMME_START_DATE=2026-11-30
GIT_LEARNING_POST_TIME=09:00
QUIZ_POST_TIME=19:00
QUIZ_START_COUNTDOWN_SECONDS=30
QUIZ_QUESTION_TIME_SECONDS=15
```

---

## 7. Developer & Agent Workflow Rules

When modifying or extending this codebase, follow these non-negotiable rules:

1. **Always Check Syntax Before Committing:**
   ```bash
   node --check <modified_file.js>
   # Or verify all src files:
   Get-ChildItem -Path src -Recurse -Filter "*.js" | ForEach-Object { node --check $_.FullName }
   ```
2. **Never Break Discord 3-Second Interaction Window:**
   Discord requires button interactions and slash commands to be acknowledged within **3000ms**. Always use `await interaction.deferReply({ flags: MessageFlags.Ephemeral })` or respond immediately with `interaction.reply()`. Never perform slow database queries before replying or deferring.
3. **Use Ephemeral Flags for Private Responses:**
   In Discord.js v14, use `flags: MessageFlags.Ephemeral` (do NOT use `ephemeral: true`).
4. **Timezone Awareness:**
   Never use local host time for calculations. Always format dates through `Asia/Kolkata`:
   ```javascript
   new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); // YYYY-MM-DD
   ```
5. **Database Error Resilience:**
   Never throw unhandled errors that can crash the bot process. Always wrap Supabase queries in try/catch and log with `logger.warn` or `logger.error`.
6. **Git Deployments:**
   Commits pushed to `origin/main` automatically trigger Railway production builds. Always ensure files are tested before pushing.
7. **Testing Commands Locally:**
   - To verify configuration: `node --env-file=.env src/scripts/verifyConfig.js`
   - To test programme calculation:
     ```bash
     node -e "import('./src/services/learning/gitLearningManager.js').then(m => console.log('Current day:', m.calculateProgrammeDay('2026-11-30')))"
     ```
