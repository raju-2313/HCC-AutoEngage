# HCC AutoEngage 🚀

**Discord automation bot for HackerRank Campus Crew (HCC)**

Automates community engagement through daily quizzes, coding challenges, XP points, leaderboards, and achievement tracking — built for both beginners and experienced developers.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Slash Commands](#slash-commands)
- [Deployment Script](#deployment-script)
- [Hosting Options](#hosting-options)
- [Development Phases](#development-phases)
- [Contributing](#contributing)

---

## Features

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Discord bot foundation (`/ping`, `/help`) | ✅ Complete |
| 2 | Supabase database integration | 🔜 Planned |
| 3 | Daily quiz engine | 🔜 Planned |
| 4 | Points, XP, leaderboards | 🔜 Planned |
| 5 | Automated activities (8 types) | 🔜 Planned |
| 6 | Admin commands | 🔜 Planned |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (LTS) |
| Discord SDK | discord.js v14 |
| Language | JavaScript ES Modules |
| Database | Supabase (PostgreSQL) |
| Scheduling | Supabase Cron |
| Config | dotenv |
| Version Control | Git / GitHub |

---

## Project Structure

```
HCC-AutoEngage/
├── src/
│   ├── index.js              ← Main entry point
│   ├── config/
│   │   └── index.js          ← Config loader & validation
│   ├── bot/
│   │   ├── client.js         ← Discord client factory
│   │   ├── commandLoader.js  ← Dynamic command discovery
│   │   └── eventLoader.js    ← Dynamic event discovery
│   ├── commands/
│   │   ├── ping.js           ← /ping command
│   │   └── help.js           ← /help command
│   ├── events/
│   │   ├── ready.js          ← Bot online handler
│   │   ├── interactionCreate.js ← Command/button router
│   │   ├── error.js          ← Discord error handler
│   │   └── warn.js           ← Discord warning handler
│   ├── services/             ← Business logic (Phase 3+)
│   ├── database/             ← Supabase client & queries (Phase 2+)
│   ├── scheduler/            ← Cron job definitions (Phase 5+)
│   ├── scripts/
│   │   └── deployCommands.js ← Slash command registration
│   └── utils/
│       ├── logger.js         ← Structured logger
│       ├── embeds.js         ← Reusable Discord embeds
│       └── permissions.js    ← Admin role check helper
├── migrations/               ← Supabase SQL migrations (Phase 2+)
├── .env.example              ← Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- The bot invited to your server with the correct permissions

### 1. Clone the repo

```bash
git clone https://github.com/your-org/hcc-autoengage.git
cd hcc-autoengage
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

### 4. Deploy slash commands (once)

```bash
node src/scripts/deployCommands.js
```

### 5. Start the bot

```bash
npm start
# or for auto-reload during development:
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Bot token from the Developer Portal |
| `DISCORD_CLIENT_ID` | ✅ | Application ID (General Information page) |
| `DISCORD_GUILD_ID` | ✅ | Your HCC server ID |
| `DISCORD_ANNOUNCEMENTS_CHANNEL_ID` | Phase 3 | Channel for daily quiz announcements |
| `DISCORD_QUIZ_CHANNEL_ID` | Phase 3 | Channel where quizzes are posted |
| `DISCORD_LEADERBOARD_CHANNEL_ID` | Phase 4 | Channel for leaderboard posts |
| `DISCORD_LOGS_CHANNEL_ID` | Optional | Channel for bot activity logs |
| `SUPABASE_URL` | Phase 2 | Supabase project URL |
| `SUPABASE_ANON_KEY` | Phase 2 | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 2 | Supabase service role key (keep secret!) |
| `TZ` | Optional | Timezone for scheduling (default: `Asia/Kolkata`) |
| `QUIZ_POST_TIME` | Phase 3 | Daily quiz time in HH:MM format |
| `ADMIN_ROLE_NAME` | Phase 6 | Discord role name with admin access |

---

## Slash Commands

### Phase 1 (available now)

| Command | Description |
|---------|-------------|
| `/ping` | Check bot status and measure round-trip latency |
| `/help` | Show all available commands |

### Planned (future phases)

| Command | Phase |
|---------|-------|
| `/quiz today` | 3 |
| `/quiz answer` | 3 |
| `/quiz history` | 3 |
| `/leaderboard weekly` | 4 |
| `/leaderboard monthly` | 4 |
| `/profile` | 4 |
| `/admin quiz publish` | 6 |
| `/admin stats` | 6 |

---

## Deployment Script

Slash commands must be registered with Discord before they appear in the client.

```bash
# Guild-scoped (instant, recommended during development)
node src/scripts/deployCommands.js

# To switch to global commands, edit deployCommands.js:
# Change Routes.applicationGuildCommands → Routes.applicationCommands
# Global commands take up to 1 hour to propagate globally
```

---

## Hosting Options

The bot requires a persistent Node.js process. Options:

| Option | Cost | Recommended for |
|--------|------|-----------------|
| **Railway** | ~$5/mo free tier | Easy setup, production-ready |
| **Render** | Free (spins down) / $7/mo | Development and staging |
| **Fly.io** | ~$2–3/mo | Small production bots |
| **VPS (Hetzner/DigitalOcean)** | ~$4–6/mo | Full control, production |
| **Local machine** | Free | Development only |

> ⚠️ Do not use Supabase Edge Functions to run the Discord Gateway connection — they are serverless and will time out.

---

## Development Phases

1. **Phase 1** – Bot foundation: login, `/ping`, `/help` ✅
2. **Phase 2** – Supabase schema & migrations
3. **Phase 3** – Daily quiz engine with button interactions
4. **Phase 4** – XP, points, weekly/monthly leaderboards
5. **Phase 5** – 8 activity types (Daily Tech Quiz active, rest modular)
6. **Phase 6** – Admin commands with permission checks

---

## Contributing

This project is maintained by the HackerRank Campus Crew core team.

For questions, reach out in the HCC Discord server.

---

*HCC AutoEngage is an open-source community project. It is not affiliated with or endorsed by HackerRank.*
