# HCC AutoEngage: Git & GitHub 15-Day Learning Programme
## Phase 2 Content Packages & Validation Report

**Programme:** 15-Day Git & GitHub Learning Programme  
**Target:** Beginner to Early-Intermediate HCC Members  
**Quiz Specification:** 10 Questions/Day, 15s per Question, +10 Points & +20 XP per correct answer  
**Verification Status:** **100% Passed (150/150 Questions, 15/15 Packages Validated)**

---

## 1. Daily Content Packages Summary

Every day folder under `learning-content/git-github/day-01/` through `day-15/` contains 7 structured JSON packages:
1. `topic.json`: Metadata, title, difficulty, part (A/B/C), student-friendly intro, real-world context, estimated time.
2. `visual-resources.json`: 1–2 verified free visual learning items (YouTube walkthroughs, explainers, interactive sandboxes).
3. `reading-resources.json`: 1–3 verified documentation and written tutorial guides (Pro Git, Atlassian, GitHub Docs, freeCodeCamp).
4. `learning-objectives.json`: 5 clear, actionable learning targets for the day.
5. `practical-task.json`: Hands-on terminal activity with step-by-step instructions, expected output, and tips.
6. `quiz.json`: 10 multiple-choice questions configured for the existing `dailyTimedSessionEngine.js` format (15s timer, 10 pts, 20 XP).
7. `explanations.json`: 10 detailed educational explanations and pro-tips matched 1-to-1 with every quiz question.

---

## 2. Validation Matrix

| Day | Part | Topic Title | Questions | Visual Track | Reading Track | Practical Task | Status |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **01** | A | What is Version Control & Git vs GitHub? | 10 (15s) | 2 verified | 2 verified | Explore real GitHub repo | ✅ Validated |
| **02** | A | Installing Git & First-Time Configuration | 10 (15s) | 1 verified | 2 verified | Install & `git config` | ✅ Validated |
| **03** | A | Creating Your First Repo & 3-Stage Workflow | 10 (15s) | 1 verified | 2 verified | `git init`, `add`, `commit` | ✅ Validated |
| **04** | A | Inspecting History & Viewing Changes | 10 (15s) | 1 verified | 1 verified | `git log --oneline`, `diff` | ✅ Validated |
| **05** | A | Undoing Mistakes Safely (restore, reset, revert) | 10 (15s) | 2 verified | 2 verified | `restore --staged`, `revert` | ✅ Validated |
| **06** | A | Project Hygiene: .gitignore & README.md | 10 (15s) | 1 verified | 3 verified | Create `.gitignore` & README | ✅ Validated |
| **07** | B | Remote Repositories & Connecting to GitHub | 10 (15s) | 2 verified | 2 verified | `git remote add origin` | ✅ Validated |
| **08** | B | Syncing Code: push, clone, pull & fetch | 10 (15s) | 1 verified | 2 verified | Round-trip sync & pull | ✅ Validated |
| **09** | B | Branching Fundamentals | 10 (15s) | 2 verified | 2 verified | Feature branch isolation | ✅ Validated |
| **10** | B | Merging Branches | 10 (15s) | 1 verified | 1 verified | Merge to `main` & clean up | ✅ Validated |
| **11** | B | Handling & Resolving Merge Conflicts | 10 (15s) | 1 verified | 1 verified | Trigger & resolve conflict | ✅ Validated |
| **12** | C | Forking & Upstream Syncing | 10 (15s) | 1 verified | 1 verified | Fork repo & set upstream | ✅ Validated |
| **13** | C | Pull Requests (PRs) & Code Reviews | 10 (15s) | 2 verified | 3 verified | Open, review, merge PR | ✅ Validated |
| **14** | C | GitHub Issues, Discussions & Team Workflows | 10 (15s) | 1 verified | 2 verified | Issue + `Closes #1` in PR | ✅ Validated |
| **15** | C | Capstone: Full Collaborative Workflow Simulation | 10 (15s) | 1 verified | 2 verified | End-to-end 8-step lifecycle | ✅ Validated |

**Totals:**
- **Total Days:** 15
- **Total Quiz Questions:** 150 (all with verified options, answers, point allocations, and explanations)
- **Total Visual Resources:** 20 verified links
- **Total Reading Resources:** 28 verified links
- **Total Learning Objectives:** 75 objectives across the curriculum
- **Total Practical Activities:** 15 progressive tasks (Days 1–6 local, Days 7–11 remotes/branching, Days 12–15 open source & PRs)

---

## 3. Quiz Engine Compatibility Check

- **Schema:** Matches existing `dailyTimedSessionEngine.js` requirements (`meta.totalQuestions: 10`, `meta.questionTimeSec: 15`).
- **Scoring:** Preserves existing economy (`10 points`, `20 XP` per question).
- **Category:** Assigned `category: "git"` which activates syntax-highlighted code snippets in the Discord embeds.
- **Answer Integrity:** Script verified that `explanations.json` matches `quiz.json` with 100% agreement on `correctAnswer` across all 150 questions.
