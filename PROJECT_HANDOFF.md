# HCC-AutoEngage: Project Handoff & Architecture Guide

> **Document Version:** 2.0.0 (Phase 1 Testing Concluded)  
> **Status:** All Automated Schedulers & Checkers SUSPENDED (Dormant Mode)  
> **Target Date:** November 15, 2026  
> **Maintainer:** `raju-2313` (`kumbharraju784@gmail.com`)  
> **Repository:** `https://github.com/raju-2313/HCC-AutoEngage.git`

---

## 1. Project Overview & Current Operating Status

**HCC-AutoEngage** is the automated Discord community engagement and gamification engine for the **HackerRank Campus Crew (HCC)**. 

### Phase 1 7-Day Sprint Testing Concluded (Nov 9 – Nov 15, 2026)
* **Sprint Window:** November 9 – November 15, 2026.
* **Sprint Participants:** 30 unique members, 639 total answers submitted, 428 correct answers (67% community accuracy).
* **Current Operating State:** **DORMANT / SUSPENDED**.
  * `AUTOMATION_SUSPENDED = true` is set in `src/services/automation/scheduler.js`.
  * **Zero automated background crons** are registered or running.
  * **Zero daily drops** will occur tomorrow or on future dates.
  * **Zero startup recovery tasks** will execute on container restarts.
  * The bot remains online in standby mode (`Phase 1 Complete 🏆 | /help`) responding only to manual admin commands (`/admin ...`).

---

## 2. Infrastructure & Verified Channels

* **Runtime:** Container hosted on **Railway** (deploys automatically from `origin/main`).
* **Database:** **Supabase (PostgreSQL)** housing all member accounts, historical attempts, and consolidated balances.
* **Main Quiz / Discussion Channel (`#💬・general`):** `1538470672722952303`
* **Official Announcement Channel (`#📢・announcements`):** `1538470372918165587`
* **Sandbox / Testing Channel (`#autoengage-testing`):** `1567916304118063124`

---

## 3. 7-Day Sprint Summary & Results

All 7 days were executed and completed:

| Date | Day | Topic | Total Questions | Status |
| :--- | :---: | :--- | :---: | :--- |
| **Nov 9** | Day 1 | Python Basics | 10 | Completed |
| **Nov 10** | Day 2 | C Programming Basics | 10 | Completed |
| **Nov 11** | Day 3 | Loops & Iterations | 10 | Completed |
| **Nov 12** | Day 4 | Conditionals & Logic | 10 | Completed |
| **Nov 13** | Day 5 | Git & GitHub | 10 | Completed |
| **Nov 14** | Day 6 | HTML & Web Foundations | 10 | Completed |
| **Nov 15** | Day 7 | Tech & Computer Basics | 10 | Completed (Finale) |

### Official Final Podium (Post Bug-Fix Compensation)
* 🥇 **1st Place:** `karan20071` (`846379972134174730`) — **530 pts** · 1,135 XP (41/56 correct, 73% acc)
* 🥈 **2nd Place:** `krishnaacharya08` (`1567817875023073343`) — **520 pts** · 1,115 XP (44/59 correct, 75% acc)
* 🥉 **3rd Place:** `samiksha_2007` (`1554487457192345621`) — **450 pts** · 935 XP (35/42 correct, 83% acc)

---

## 4. Phase 1 Errors Encountered & How They Were Resolved

During Phase 1 sprint testing, four primary system and operational errors were uncovered and systematically fixed:

### Issue 1: Discord 3-Second ACK Timeout on High Concurrency (`(!) This interaction failed`)
* **Root Cause:** When 20+ students tapped answer buttons simultaneously within a 15-second window, backend verification and Supabase RPC transactions occasionally took longer than Discord Gateway's hard 3000ms acknowledgment window before responding. This caused Discord on mobile/desktop to show `(!) This interaction failed` to students, even though they had chosen the right answer.
* **Resolution:** 
  1. Ran an exhaustive audit across all 78 questions and 639 submissions in Supabase (`scripts/analyze_gaps_v2.mjs`).
  2. Applied an **Interior Gap Detection algorithm** (identifying participants who answered questions before and after a missing question, proving they were active and experiencing interaction dropouts).
  3. Identified **27 affected participants** and applied atomic compensation (+10 pts / +20 XP per missed interior question, total 1,570 pts / 3,140 XP) to live member balances.
  4. Fairly resolved the leaderboard: `karan20071` (verified with screenshot evidence of interaction failures on Day 7 Q4) rightfully secured 1st place with 530 pts.

### Issue 2: Last-Second Click Race Condition
* **Root Cause:** Clicks submitted with <2 seconds remaining arrived at the server as the question was closing, generating `Quiz is not active for submissions`.
* **Resolution:** Caught `QUIZ_EXPIRED` gracefully in `attempts.js` and `quizService.js`, returning a helpful ephemeral guidance card advising participants to tap with ~3s remaining.

### Issue 3: Announcement Channel Missing Permissions (`DiscordAPIError[50013]: Missing Permissions`)
* **Root Cause:** `#📢・announcements` (`1538470372918165587`) had `@everyone` denied `Send Messages`. The bot lacked an explicit role or permission override allowing message posting in announcements, throwing `Missing Permissions`. Because slash commands defer as ephemeral receipts for admins, the error appeared as a private ephemeral failure box.
* **Resolution:** Added `HCC Moderator` role to `HCC AutoEngage`, hardcoded target channel ID `1538470372918165587`, and verified permissions (`canSend: true`, `canEmbed: true`, `canMention: true`).

### Issue 4: Railway Malformed Environment Variable
* **Root Cause:** Railway environment configuration contained a clipped ID (`567916304118063124` missing the leading `1`), overriding code fallbacks and causing `Channel Not Found`.
* **Resolution:** Hardcoded verified channel constants in `src/commands/admin.js` to ensure the bot directly targets `#📢・announcements` without relying on erroneous environment variables, and added an optional `channel:` slash command picker.

---

## 5. Automation Suspension Policy (From Nov 16 Onward)

To prevent any unexpected automated posts or database modifications:

1. **`AUTOMATION_SUSPENDED = true`** in `src/services/automation/scheduler.js`.
2. **`initScheduler()`** logs suspension notice and returns immediately (0 crons active).
3. **`reconcileMissedJobsOnStartup()`** is bypassed on all container boots.
4. **All community announcements and leaderboards** are strictly manually controlled via `/admin announce leaderboard` and `/admin announce weekly`.

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
   node -e "import('./src/services/quiz/sessionQuestionManager.js').then(m => console.log('Ready for Day', m.getDayQuestionSet('2026-11-15').meta.dayNumber))"
   ```
   *(Expected output: `Ready for Day 7`)*

---

*Handoff complete. The automated engine on Railway is self-sufficient and will execute all remaining days automatically at 19:00 IST.*
