# HCC AutoEngage 🚀

**Autonomous Community Gamification & Engagement Engine for HackerRank Campus Crew (HCC)**

HCC AutoEngage is a cloud-hosted Discord automation platform designed to drive active, competitive peer learning. It powers synchronized daily coding challenges, XP point balances, streak multipliers, voice study session tracking, administrative moderation suites, and real-time community leaderboards.

---

## 📌 Project Status: Phase 1 Sprint Concluded (Nov 9 – 15, 2026)

The initial **7-Day Daily Tech Challenge Sprint** has successfully concluded. All 6 development phases are implemented.
Automated background cron drops are currently **SUSPENDED** (`AUTOMATION_SUSPENDED = true`) in standby mode while Phase 2 planning commences.

### 🏆 7-Day Sprint Highlights

- **Duration:** 7 Consecutive Days (Nov 9 – Nov 15, 2026).
- **Participation:** 30 Unique Campus Members.
- **Activity:** 639 Total Submissions · 428 Correct Answers (67% Community Accuracy).
- **Official Podium:**
  - 🥇 **Champion:** `karan20071` — **530 pts** · 1,135 XP (73% accuracy)
  - 🥈 **Runner-Up:** `krishnaacharya08` — **520 pts** · 1,115 XP (75% accuracy)
  - 🥉 **3rd Place:** `samiksha_2007` — **450 pts** · 935 XP (83% accuracy)

---

## 📑 Table of Contents

- [Architecture & Tech Stack](#architecture--tech-stack)
- [Feature Implementation Matrix](#feature-implementation-matrix)
- [7-Day Challenge Sprint Calendar](#7-day-challenge-sprint-calendar)
- [Project Directory Structure](#project-directory-structure)
- [Slash Command Reference](#slash-command-reference)
- [Environment Configuration](#environment-configuration)
- [Error Resolutions & Hardening](#error-resolutions--hardening)
- [Quick Start & Local Development](#quick-start--local-development)
- [License & Disclaimer](#license--disclaimer)

---

## 🛠️ Architecture & Tech Stack

| Component              | Technology                | Purpose                                                |
| :--------------------- | :------------------------ | :----------------------------------------------------- |
| **Runtime**            | Node.js v20+ (ES Modules) | Asynchronous event loop & process management           |
| **Discord SDK**        | `discord.js` v14          | Gateway interactions, button components, and embeds    |
| **Database**           | Supabase (PostgreSQL 15)  | Relational persistence, atomic RPC procedures, and RLS |
| **Scheduler**          | `node-cron`               | Timezone-aware (Asia/Kolkata) cron triggers            |
| **Production Hosting** | Railway                   | 24/7 containerized cloud deployment with auto-CI       |
| **Health Monitoring**  | Native HTTP Server        | Lightweight `/ping` & `/health` endpoints on port 8080 |

---

## ✅ Feature Implementation Matrix

| Phase | Milestone             | Features & Capabilities                                                                 |   Status    |
| :---: | :-------------------- | :-------------------------------------------------------------------------------------- | :---------: |
| **1** | **Foundation**        | Client bootstrap, gateway connection, `/ping`, `/help`, structured logging              | ✅ Complete |
| **2** | **Data Layer**        | Supabase client singleton, migration schemas, member profiles, logs                     | ✅ Complete |
| **3** | **Quiz Engine**       | 10-question timed sessions, 15s answer clocks, Discord buttons, ephemeral feedback      | ✅ Complete |
| **4** | **Gamification**      | Points (+10), XP (+20), streak tracking, level calculations, `/profile`, `/leaderboard` | ✅ Complete |
| **5** | **Automation**        | Cron scheduler (19:00 IST drops), expired quiz auto-close, recovery reconciler          | ✅ Complete |
| **6** | **Admin Suite**       | `/admin points`, `/admin quiz`, `/admin announce`, `/admin stats`, `/purge`             | ✅ Complete |
| **★** | **Engagement Engine** | Voice study session duration tracking, custom channel multipliers                       | ✅ Complete |
| **★** | **Media Curation**    | Moderated Sticker & Emoji discovery pipelines with human review queues                  | ✅ Complete |

---

## 📅 7-Day Challenge Sprint Calendar

| Date       |  Day  | Topic                  |     Category     | Format                      |   Status    |
| :--------- | :---: | :--------------------- | :--------------: | :-------------------------- | :---------: |
| **Nov 9**  | Day 1 | Python Basics          |     `python`     | 10 Rapid Questions          | ✅ Complete |
| **Nov 10** | Day 2 | C Programming Basics   |       `c`        | 10 Rapid Questions          | ✅ Complete |
| **Nov 11** | Day 3 | Loops & Iterations     |     `python`     | 10 Rapid Questions          | ✅ Complete |
| **Nov 12** | Day 4 | Conditionals & Logic   | `python` / logic | 10 Rapid Questions          | ✅ Complete |
| **Nov 13** | Day 5 | Git & GitHub           |      `bash`      | 10 Rapid Questions          | ✅ Complete |
| **Nov 14** | Day 6 | HTML & Web Foundations |      `html`      | 10 Rapid Questions          | ✅ Complete |
| **Nov 15** | Day 7 | Tech & Computer Basics |   `plain / cs`   | 10 Rapid Questions (Finale) | ✅ Complete |

---

## 📂 Project Directory Structure

```
HCC-AutoEngage/
├── src/
│   ├── index.js                     ← Main application entry point & graceful shutdown
│   ├── bot/
│   │   ├── client.js                ← Discord client factory & intent flags
│   │   ├── commandLoader.js         ← Dynamic slash command registry
│   │   └── eventLoader.js           ← Dynamic gateway event router
│   ├── commands/                    ← Slash command handlers
│   │   ├── admin.js                 ← Full administrative suite (/admin)
│   │   ├── emoji.js                 ← Emoji curation & approval (/emoji)
│   │   ├── engagement.js            ← Personal engagement metrics (/engagement)
│   │   ├── help.js                  ← Interactive help catalog (/help)
│   │   ├── leaderboard.js           ← Public & ephemeral rankings (/leaderboard)
│   │   ├── ping.js                  ← Round-trip latency check (/ping)
│   │   ├── profile.js               ← Member card with streak & level (/profile)
│   │   ├── purge.js                 ← Channel cleanup utility (/purge)
│   │   ├── quiz.js                  ← Quiz status & manual triggers (/quiz)
│   │   └── sticker.js               ← Sticker catalog & review (/sticker)
│   ├── config/                      ← Centralized environment configuration
│   ├── data/question-banks/         ← Curated 10-question JSON banks for Days 1–7
│   ├── database/                    ← Supabase client & SQL access layer
│   │   └── queries/                 ← Domain queries (attempts, members, quizzes, logs)
│   ├── events/                      ← Discord event listeners (clientReady, interactionCreate, messageCreate)
│   ├── scripts/                     ← Deployment, diagnostic, and gap analysis scripts
│   ├── services/
│   │   ├── automation/              ← scheduler.js (node-cron job definitions)
│   │   ├── emojis/                  ← Emoji discovery & review service
│   │   ├── quiz/                    ← dailyTimedSessionEngine.js, sessionQuestionManager.js
│   │   ├── recognition/             ← leaderboardService.js, weeklyAnnouncementService.js
│   │   ├── stickers/                ← Sticker discovery & curation service
│   │   └── voice/                   ← voiceService.js (voice study session tracking)
│   └── utils/                       ← Logger, embed factories, permission helpers
├── scripts/                         ← Independent verification & data audit scripts
├── migrations/                      ← PostgreSQL schemas & functions
├── .env.example                     ← Template for required environment variables
├── Dockerfile                       ← Production container specification
├── package.json                     ← Dependencies and npm scripts
├── PROJECT_HANDOFF.md               ← Comprehensive architectural handoff guide
└── README.md                        ← This documentation
```

---

## 🤖 Slash Command Reference

### Member Commands

| Command          | Options       | Description                                                  |
| :--------------- | :------------ | :----------------------------------------------------------- |
| `/profile`       | `[user]`      | View points, total XP, current level, streak, and quiz stats |
| `/leaderboard`   | `[timeframe]` | View current server standings (All-time, Weekly, Monthly)    |
| `/quiz stats`    | —             | Check personal quiz completion numbers and win rates         |
| `/engagement me` | —             | View text chat, reaction, and voice study session scores     |
| `/ping`          | —             | Verify bot connectivity and measure Discord API latency      |
| `/help`          | —             | Explore command documentation and instructions               |

### Administrator Commands (`HCC Admin` / Administrator Role Required)

| Command                       | Options                           | Description                                                         |
| :---------------------------- | :-------------------------------- | :------------------------------------------------------------------ |
| `/admin announce leaderboard` | `[channel] [ping_everyone] [top]` | Broadcast official Final Leaderboard with podium and @everyone ping |
| `/admin announce weekly`      | —                                 | Broadcast the weekly community digest and honors                    |
| `/admin points`               | `<user> <amount> [xp] [reason]`   | Manually award or deduct points/XP with audit trail                 |
| `/admin quiz publish`         | `[question_id]`                   | Manually drop a daily quiz into the quiz channel                    |
| `/admin quiz close`           | —                                 | Force-close the active quiz challenge immediately                   |
| `/admin streak reset`         | `<user>`                          | Reset a member's daily participation streak                         |
| `/admin stats`                | —                                 | Inspect server-wide participation and health metrics                |
| `/purge`                      | `[amount]`                        | Bulk-delete bot-authored messages in the current channel            |

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and populate your secrets:

```env
# Discord Gateway Credentials
DISCORD_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"
DISCORD_GUILD_ID="your_guild_id"

# Key Channel Identifiers
DISCORD_QUIZ_CHANNEL_ID="1538470672722952303"          # #💬・general
DISCORD_ANNOUNCEMENTS_CHANNEL_ID="1538470372918165587"   # #📢・announcements
TEST_CHANNEL_ID="1567916304118063124"                   # #autoengage-testing

# Supabase PostgreSQL
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Application Settings
TZ="Asia/Kolkata"
QUIZ_POST_TIME="19:00"
ADMIN_ROLE_NAME="HCC Admin"
```

---

## 🛡️ Error Resolutions & Hardening (Phase 1 Retrospective)

During live sprint execution, four system challenges were resolved to protect competitive fairness:

1. **Discord 3s Gateway ACK Timeout (`(!) This interaction failed`):**
   - _Challenge:_ When 20+ students clicked answer buttons simultaneously, network latency to Supabase occasionally exceeded Discord's 3000ms acknowledgment window.
   - _Resolution:_ Executed an **Interior Gap Detection audit** across 639 submissions. Identified 27 participants whose responses were dropped between active questions and awarded full compensation (+10 pts / +20 XP per dropped question, total 1,570 pts).
2. **Late-Click Race Conditions:**
   - _Challenge:_ Clicks submitted with <2s remaining arrived while the question was closing, throwing unhandled exceptions.
   - _Resolution:_ Handled `QUIZ_EXPIRED` cleanly, delivering an ephemeral advisory to tap earlier.
3. **Announcement Permissions:**
   - _Challenge:_ `#📢・announcements` denied message permissions to `@everyone`, blocking automated winner posts.
   - _Resolution:_ Added `HCC Moderator` role to the bot and hardcoded safe channel resolution fallbacks.
4. **Railway Environment Variable Typos:**
   - _Challenge:_ A malformed channel ID in Railway's dashboard caused `Channel Not Found`.
   - _Resolution:_ Enforced verified constant channel routing in code.

---

## 💻 Quick Start & Local Development

### 1. Clone & Install

```bash
git clone https://github.com/raju-2313/HCC-AutoEngage.git
cd HCC-AutoEngage
npm install
```

### 2. Register Slash Commands

```bash
node src/scripts/deployCommands.js
```

### 3. Launch the Bot

```bash
# Production mode:
npm start

# Development mode (with file watcher):
npm run dev
```

---

## ⚖️ License & Disclaimer

Maintained by the **HackerRank Campus Crew (HCC)** core team.  
_HCC AutoEngage is an open-source community initiative. It is not officially affiliated with or endorsed by HackerRank._
