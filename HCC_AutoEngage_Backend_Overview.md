# HCC AutoEngage: Comprehensive Backend Analysis & Architecture Report

> **Prepared for:** HackerRank Campus Crew (HCC) Team & Leadership  
> **Classification:** Internal Technical & Operational Overview  
> **Bot Version:** 1.0.0 (Production / Staging Verified)  
> **Date:** November 2026  

---

## Executive Summary

**HCC AutoEngage** is an automated community engagement system engineered specifically for the HackerRank Campus Crew (HCC) Discord ecosystem. Built with Node.js, `discord.js` v14, and Supabase (PostgreSQL with Row Level Security), the bot automates technical learning, daily participation, gamification, and member recognition.

This document presents a comprehensive, code-verified audit of the bot's architecture, operations, gamification algorithms, automation pipelines, and administrative capabilities.

---

## 1. Introduction: Purpose & Problem Solved

### What is HCC AutoEngage?
HCC AutoEngage is a specialized Discord bot designed to turn passive server members into active daily learners. It serves as an automated tournament master, quiz manager, community scorekeeper, and recognition engine.

### Why Did We Build It?
Student and developer communities typically face two common hurdles:
1. **The Inactivity Slump:** Community servers often suffer from low engagement between major events or hackathons.
2. **High Moderator Overhead:** Manually hosting quizzes, calculating scores, maintaining spreadsheets, tracking streaks, and publishing weekly digests requires hours of manual organizer labor every week.

### What Problems Does It Solve?
- **Zero-Manual Daily Quizzes:** Quizzes are automatically posted every morning at 09:00 AM IST with zero organizer intervention.
- **Fair, Cheat-Resistant Scoring:** Single-attempt constraints, atomic database transactions, server-side countdown timers, and button-level disabled states guarantee competitive fairness.
- **Multi-Dimensional Recognition:** Rather than recognizing only fast coders, the engine scores learning, discussions, voice study rooms, emoji reactions, and peer assistance.
- **Automated Social Proof:** Automated podiums, weekly honoree digests, and monthly champion crownings keep enthusiasm consistently high.

---

## 2. Member Experience: How Members Interact

Members interact with HCC AutoEngage primarily through Discord Slash Commands and interactive UI buttons on quiz messages.

### Member Command Suite

| Command | Category | Purpose | Member Value |
| :--- | :--- | :--- | :--- |
| `/quiz today` | Quiz & Learning | Fetches today's active quiz or status | Lets members jump straight into today's challenge |
| `/quiz stats` | Personal Analytics | Displays personal quiz accuracy and current streak | Tracks question accuracy rate and participation history |
| `/quiz live` | Real-time Blitz | Starts an ad-hoc live challenge in the channel | Instant group competition with custom timers |
| `/profile [user]` | Gamification | Displays XP progress, level tier, streaks, and badges | Visual representation of personal growth and accolades |
| `/leaderboard` | Competition | Interactive weekly, monthly, and all-time rankings | Real-time visibility into competitive standings |
| `/engagement me` | Community Engine | 30-day breakdown across all 5 engagement dimensions | Transparent breakdown of learning vs discussion points |
| `/engagement stats` | Peer Inspection | Displays engagement breakdown for any other member | Fosters healthy peer competition and collaboration |
| `/engagement thank` | Peer Recognition | Acknowledges a peer with +5 points & +10 XP | Encourages helping peers and sharing resources |
| `/ping` | Diagnostics | Checks bot response latency and gateway connection | Quick confirmation of bot responsiveness |
| `/help` | Reference | Explains all commands and bot operations | Easy onboarding for new members |

### How Members Participate in Daily Challenges
1. At **09:00 AM IST**, an announcement drops in `#daily-quiz` notifying the community of the day's topic.
2. A **30-second countdown** gives members time to gather and prepare.
3. Questions drop sequentially. Each question displays code snippets (if applicable), difficulty rating, point stakes, a live Discord relative countdown timer (`<t:...:R>`), and four interactive buttons (`[🅰️ Option A]`, `[🅱️ Option B]`, `[🇨 Option C]`, `[🇩 Option D]`).
4. Members select their answer before the timer expires.
5. The bot responds with an **ephemeral (private)** confirmation showing whether the member answered correctly, the full technical explanation, points and XP earned, and their updated daily streak. Answers of other participants remain completely hidden during the live question window.
6. When the timer expires, the question message automatically edits to show the correct answer, community accuracy percentage, and disables all buttons.
7. After the final question, the bot calculates standings and posts an automated **Podium & Top 10 Session Leaderboard**.

---

## 3. Quiz System Architecture

The quiz architecture contains two operational modes:
1. **The 7-Day Timed Session Engine** (`dailyTimedSessionEngine.js`): The primary tournament engine that runs curated 10-question daily challenges.
2. **Single Daily Quiz / Live Runner** (`quizService.js` / `liveQuizRunner.js`): Legacy / ad-hoc single question and on-demand blitz options.

### The 7-Day Curated Tournament Calendar
The bot features 7 curated question banks stored in `src/data/question-banks/`:

| Date (2026) | Day | Topic | File Name | Question Count & Distribution |
| :--- | :--- | :--- | :--- | :--- |
| **09 Nov** | Day 1 | Python Basics | `day-01-python.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **10 Nov** | Day 2 | JavaScript | `day-02-javascript.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **11 Nov** | Day 3 | Loops | `day-03-loops.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **12 Nov** | Day 4 | Arrays & DSA | `day-04-arrays-dsa.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **13 Nov** | Day 5 | Git & GitHub | `day-05-git-github.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **14 Nov** | Day 6 | HTML Basics | `day-06-html.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |
| **15 Nov** | Day 7 | Strings | `day-07-strings.json` | 10 Questions (6 Easy, 3 Medium, 1 Challenge) |

*Total verified curated questions: **70 questions** across 7 days.*

### Timers and State Management
- **Countdown Timer:** Controlled by `QUIZ_START_COUNTDOWN_SECONDS` (30 seconds). Displays an active countdown before Question 1.
- **Question Answering Window:** Questions specify `timeLimitSeconds: 15` in JSON banks. The engine defaults to `QUIZ_QUESTION_TIME_SECONDS` (fallback: 20 seconds). When the answering window expires:
  - Database status is instantly marked `closed` via `closeQuiz(quizId)`. Any submission arriving after this timestamp is rejected at the PostgreSQL level.
  - Interactive buttons are disabled and styled (correct button turns green `ButtonStyle.Success`).
  - An intermission pause (4 seconds) occurs between questions.
- **Atomic Submissions & Anti-Cheat:**
  - Evaluated through PostgreSQL stored procedure `submit_quiz_attempt(p_quiz_id, p_discord_id, p_selected_option)`.
  - Enforces `UNIQUE(quiz_id, member_id)` at the database constraint level. Members cannot double-submit or retry by spamming buttons.
  - Automatically awards points (+10 pts) and XP (+20 XP) for correct answers, or participation XP (+5 XP) for wrong answers.

---

## 4. Gamification Mechanics

### Points, XP, and Level Curve
- **Points:** The competitive currency used for leaderboard rankings and competition rewards.
- **XP (Experience Points):** Lifetime progress indicator that never resets or decays.
- **Level Calculation:** Computed algorithmically using a non-linear quadratic curve:
  $$\text{Level} = 1 + \left\lfloor \sqrt{\frac{\text{Total XP}}{50}} \right\rfloor$$
- **XP Required for Level $L$:**
  $$\text{XP Required} = (L - 1)^2 \times 50$$

#### Level Tiers:
- **Level 1–2 (0–199 XP):** 🌱 Rookie / ✨ Learner
- **Level 3–4 (200–799 XP):** 🌟 Rising Contender
- **Level 5–6 (800–1,799 XP):** ⚡ Expert Scholar
- **Level 7–9 (1,800–3,999 XP):** 🔮 Master
- **Level 10+ (4,000+ XP):** 💎 Diamond Grandmaster

### Streaks and Inactivity Reset
- Each successful quiz submission increments `streak_current` and updates `streak_max`.
- Inactivity tracking: The automated scheduler runs a maintenance job daily at **03:00 AM IST** (`resetInactiveStreaks(48)`). Members who have not submitted an answer within 48 hours have their active streak gracefully reset to 0.

### Dynamic Achievement Badges
Evaluated dynamically during `/profile`:
1. 🎯 **First Blood:** Complete your first quiz
2. 📅 **Consistent:** Complete 5 quizzes
3. 🧠 **Quiz Master:** Win 10 quizzes
4. 🔥 **On Fire:** Maintain a 3-day streak
5. ⚡ **Unstoppable:** Reach a 7-day streak
6. 🌟 **Century Club:** Earn 100+ total XP
7. 🏆 **Points Elite:** Reach 100+ total points
8. 💎 **Elite Scholar:** Reach Level 5 or higher

### Multi-Dimensional Community Engagement Scoring (Migration 002)
Beyond quizzes, the bot features a comprehensive community scoring model:
- **Learning (40% Weight):** Daily quizzes, technical challenges.
- **Discussions (25% Weight):** Meaningful text conversation (1 pt per message, 45s anti-spam cooldown, 50 pts daily cap).
- **Voice Study (15% Weight):** Voice channel participation (tracked per minute, 10s minimum session, 45 pts daily cap, auto-pauses in AFK channels).
- **Reactions (10% Weight):** Meaningful emoji reactions (0.25 pt per reaction, 15s cooldown, 20 pts daily cap, deduplicated by message).
- **Contributions & Peer Help (10% Weight):** Peer `/engagement thank` and moderator awards (+5 to +25 pts, 24h per-friend cooldown).
- **Channel Multipliers:** Learning channels (1.5x), Technical channels (1.25x), General channels (1.0x), Bot/Spam channels (0x / Excluded).

---

## 5. Automated Operations & Reliability

The bot runs six persistent automated cron tasks in the `Asia/Kolkata` timezone:

```
[09:00 AM IST] ──> Daily Quiz Drop (Starts 7-Day Timed Session or Daily Quiz)
[03:00 AM IST] ──> Streak Maintenance (Resets streaks older than 48 hours)
[23:59 PM IST] ──> Daily Quiz Auto-Close (Closes lingering active quizzes)
[Sun 21:00 IST] ──> Weekly Leaderboard & Community Digest Snapshot
[1st 00:05 IST] ──> Monthly Champion Crowning & Reward Ledger
[Every 5 Mins]  ──> 24/7 Keep-Alive Heartbeat & Connection Ping
```

### Crash Recovery & Restart Resiliency
If the container restarts, crashes, or redeploys midway through operations:
1. **Active Daily Session Recovery:** `reconcileDailySessionOnStartup(client)` detects if a session was `in_progress`. It restores state from Supabase, detects the current question index, and resumes question delivery without re-posting initial `@everyone` announcements (`suppressEveryonePing: true`).
2. **Missed Job Catch-up:** `reconcileMissedJobsOnStartup(client)` checks whether the scheduled drop time has passed today. If today's quiz was not posted due to maintenance downtime, it automatically drops the quiz immediately upon coming back online.
3. **Voice Session Reconciliation:** `initializeVoiceRecovery(client)` marks orphaned sessions as `reconciled` and re-indexes all members currently in voice channels.
4. **24/7 Keep-Alive HTTP Server:** Runs on port 8080 (or `PORT` env) exposing `/health` and `/ping` to satisfy container orchestrator health checks (Railway / Render / UptimeRobot).

---

## 6. Administration & Governance

### Access Control
All administrative commands require the **Administrator** Discord permission OR the dedicated role specified by `ADMIN_ROLE_NAME` (default: `HCC Admin`).

### Administrative Capabilities

| Command Group | Command | Capability |
| :--- | :--- | :--- |
| **Quiz Controls** | `/admin quiz publish [id]` | Immediately triggers a daily quiz or specific question |
| | `/admin quiz close` | Manually closes the active quiz ahead of schedule |
| **Points Ledger** | `/admin points grant <user> <pts>` | Grants or deducts points/XP with an audited reason |
| **Streak Overrides** | `/admin streak reset <user>` | Resets a member's streak in case of abuse or dispute |
| **Honors & Broadcasts** | `/admin announce weekly` | Manually triggers the Sunday Weekly Community Digest |
| | `/admin announce winners` | Manually calculates and announces monthly champions |
| **Channel Multipliers** | `/admin engagement channels` | Assigns category and multiplier (e.g. 1.5x) to a channel |
| **Contribution Awards** | `/admin engagement award` | Grants verified moderator awards for open-source help |
| **Audit & Metrics** | `/admin stats` | Displays server-wide participation, total answers, and streaks |

---

## 7. Technical Architecture

- **Runtime & Language:** Node.js (v20+ / v26 tested), Modern ES Modules (`import`/`export`).
- **Discord Framework:** `discord.js` v14.28.1 using Gateway Intents (`Guilds`, `GuildMessages`, `GuildMessageReactions`, `GuildVoiceStates`, `MessageContent`).
- **Database Engine:** Supabase PostgreSQL with 15 normalized tables, database-level UUID generators, row-level security (RLS), atomic stored procedures (`SECURITY DEFINER`), and foreign keys with cascading integrity.
- **Scheduling System:** In-process `node-cron` pinned to `Asia/Kolkata` with zero external cron dependency.
- **Hosting & Deployment:** Docker containerized (`Dockerfile` with `alpine-node` and `tzdata`), deployed on Railway with `restartPolicyType: ALWAYS` and PM2 process management (`ecosystem.config.cjs`).

---

## 8. Feature Status Classification

Below is the verified operational status of every feature in the repository:

| Feature / Subsystem | Status Category | Verification Notes |
| :--- | :--- | :--- |
| **Discord Bot Gateway & Health Server** | 🟢 **Implemented & Verified** | Bot connects cleanly; HTTP `/health` & `/ping` server active on port 8080. |
| **Member Commands (`/ping`, `/help`)** | 🟢 **Implemented & Verified** | Dynamic command loader; comprehensive help embed. |
| **Profile & Badges (`/profile`)** | 🟢 **Implemented & Verified** | Quadratic level formula, 12-segment progress bar, 8 dynamic achievements. |
| **Leaderboard System (`/leaderboard`)** | 🟢 **Implemented & Verified** | Interactive buttons switch between Weekly, Monthly, and All-Time views. |
| **Atomic Answer Processing** | 🟢 **Implemented & Verified** | PostgreSQL `submit_quiz_attempt` RPC enforces dedup, records points & XP. |
| **7-Day Tournament Calendar** | 🟢 **Implemented & Verified** | All 7 days mapped to topics in `CHALLENGE_CALENDAR` (Nov 9–15, 2026). |
| **70-Question Curated Question Bank** | 🟢 **Implemented & Verified** | 7 files in `src/data/question-banks/`, verified 10 Qs each (6/3/1 split). |
| **Daily Start Countdown Timer** | 🟢 **Implemented & Verified** | 30s countdown before Question 1 with Discord relative time timestamp. |
| **Automated Cron Jobs** | 🟢 **Implemented & Verified** | 6 scheduled tasks configured in `scheduler.js` with restart recovery. |
| **Admin Command Suite** | 🟢 **Implemented & Verified** | Points grants, quiz publishing/closing, streak resets, channel rules. |
| **Multi-Dimensional Engagement Engine** | 🟡 **Implemented; Staging Tested** | 5 weighted dimensions; verified via synthetic staging script. |
| **15-Second Question Timer** | 🟡 **Implemented; Config Default Discrepancy** | Bank metadata has 15s; code fallback defaults to 20s if env unset. |
| **Single @everyone Announcement** | 🟡 **Implemented; 2 Pings in Engine** | Zero pings on questions, but engine sends 2 pings (Start + Wrap-up). |
| **Live Multi-User Concurrency** | 🟡 **Implemented; Staging Tested** | Tested via mock multi-user scripts; pending real-world community load. |
| **Discord Level Roles Sync** | ⚪ **Planned for Future Update** | Granting Discord roles (e.g. "Diamond Scholar") on level up. |
| **Real-Time Web Dashboard** | ⚪ **Planned for Future Update** | Public web-based leaderboard interface. |

---

## 9. Critical Discrepancies Between Docs and Source Code

Our direct backend inspection revealed several discrepancies between early planning documents / README files and the actual production codebase:

### 1. Project Phase Completion Status
- **Documentation (`README.md`):** Lists Phase 4 (Leaderboards), Phase 5 (Automated Activities), and Phase 6 (Admin Commands) as `🔜 Planned`.
- **Actual Source Code:** **Phases 4, 5, and 6 are already fully implemented, wired, and verified.** The README was simply never updated after development completed.

### 2. Cron Scheduling Architecture
- **Documentation (`README.md`):** States scheduling is handled via `Supabase Cron`.
- **Actual Source Code:** Scheduling is handled completely inside the Node.js process using `node-cron` with timezone pinning (`Asia/Kolkata`). This makes the bot independent of external Supabase paid pg_cron extensions.

### 3. Mention Frequency (@everyone Pings)
- **Design Intent / Prompt:** Stated a "single @everyone announcement" for daily challenges.
- **Actual Source Code (`dailyTimedSessionEngine.js`):** The engine executes **two** `@everyone` announcements per session:
  - **Ping 1 of 2:** Initial launch announcement (30s before Q1).
  - **Zero Pings:** Individual questions (`allowedMentions: { parse: [] }`).
  - **Ping 2 of 2:** Wrap-up announcement revealing the Champion Podium and Session Leaderboard.
  *(This is actually a superior user experience, but represents a variance from early specifications).*

### 4. Question Timer Configuration Fallback
- **Question Banks (`day-0X.json`):** Set `timeLimitSeconds: 15`.
- **Environment Example (`.env.example`):** Sets `QUIZ_QUESTION_TIME_SECONDS=15`.
- **Engine Fallback (`dailyTimedSessionEngine.js` / `config/index.js`):** `config.app.questionTimeSeconds || 20`. If `QUIZ_QUESTION_TIME_SECONDS` is omitted from production environment variables, the timer runs for 20 seconds instead of 15 seconds.

---

## 10. What Members Can Expect (Member FAQ & Guide)

### What do members need to do?
Members simply join the designated challenge channel (e.g., `#daily-quiz`) and participate when the notification drops. When questions appear, they click the button corresponding to their answer.

### How often should they participate?
- **Daily:** Daily challenges drop once every morning at **09:00 AM IST**.
- Participating every day keeps the **Streak Multiplier** alive. Missing 48 consecutive hours resets active streaks.

### How are points and rankings tracked?
- Correct answers award **+10 Points** and **+20 XP**.
- Wrong answers still award **+5 Participation XP**.
- Points immediately credit to the member's profile and count toward the Weekly and Monthly leaderboards.
- Members can check their current rank at any moment with `/leaderboard` or `/profile`.

### How are competition winners and prizes determined?
- **Session Winners:** Determined at the end of each daily 10-question challenge based on highest points and accuracy during that session.
- **Weekly Winners:** Celebrated every Sunday at 09:00 PM IST on the Weekly Community Digest.
- **Tournament / Monthly Champions:** Crowned on the 1st of every month based on cumulative points earned during the calendar month. Top performers receive exclusive titles and prizes according to official HCC competition announcements.

