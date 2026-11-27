# HCC Git & GitHub 15-Day Learning Programme — Curriculum Plan

> **Programme:** HCC AutoEngage 15-Day Git & GitHub Learning Programme  
> **Target Audience:** Beginner to early-intermediate HCC students (assumes zero prior Git/GitHub experience)  
> **Daily Cadence:** Morning Topic & Resource Card → Daytime Self-Learning & Practical Task → Evening Topic Quiz (5–10 Qs)  
> **Phase 1 Status:** Curriculum & Source Research Finalised (Pending Review)

---

## 1. Curriculum Architecture & Difficulty Progression

The 15 days are structured into **three progressive parts**, moving from local mental models to cloud collaboration and real-world team workflows. Daily learning time is kept realistic (**20–35 minutes/day**) so students can complete it between classes.

| Part | Days | Theme | Difficulty Range |
| :--- | :---: | :--- | :--- |
| **Part A: Git Fundamentals** | Days 1–6 | Local version control, setup, tracking, history, undoing mistakes, repo hygiene | Beginner (Level 1) |
| **Part B: GitHub Fundamentals** | Days 7–11 | Remotes, syncing (`clone`, `push`, `pull`, `fetch`), branching, merging, conflicts | Beginner → Early Intermediate (Level 2) |
| **Part C: Real-World Collaboration** | Days 12–15 | Forking, pull requests, code reviews, issues/discussions, end-to-end team workflow | Intermediate-Ready (Level 3) |

---

## 2. Day-by-Day Curriculum Breakdown

### Part A: Git Fundamentals (Days 1–6)

#### Day 01 — Version Control & Git vs GitHub
- **Difficulty:** Beginner (Zero prior knowledge)
- **Estimated Time:** 20 mins (10 min visual + 10 min reading)
- **Introduction:** Understand why developers stopped naming folders `project_final_v2_REAL.zip`, what Version Control is, and the exact difference between **Git** (the local tool) and **GitHub** (the cloud platform).
- **Learning Objectives:**
  - Explain what a Version Control System (VCS) solves.
  - Distinguish between Centralized and Distributed VCS.
  - Clearly differentiate Git (local tool) from GitHub (remote hosting & collaboration).
- **Visual Track:** *Git Explained in 100 Seconds* (Fireship) + *Git Tutorial 1: What is git / What is version control system?* (codebasics)
- **Reading Track:** *What is version control* (Atlassian Git Tutorials)
- **Practical Task:** Create a free GitHub account (if not already created) and note 3 reasons why version control helps in college/hackathon projects.

#### Day 02 — Installing & Configuring Git
- **Difficulty:** Beginner
- **Estimated Time:** 25 mins
- **Introduction:** Get Git installed on your computer and introduce yourself to Git so every future save is tagged with your name and email.
- **Learning Objectives:**
  - Install Git (or Git Bash on Windows) and verify with `git --version`.
  - Configure global identity (`user.name` and `user.email`) and default branch (`main`).
  - Inspect current configuration using `git config --list`.
- **Visual Track:** *Git for Beginners: What is git? Why use it? How to install it. (Part 1)* (SelfTeach.me)
- **Reading Track:** *Getting Started — Installing Git & First-Time Git Setup* (Pro Git / git-scm.com)
- **Practical Task:** Run `git --version`, set `git config --global user.name` and `user.email`, and verify with `git config --list`.

#### Day 03 — Creating Your First Repository & The Three-Stage Workflow
- **Difficulty:** Beginner
- **Estimated Time:** 30 mins
- **Introduction:** Learn how Git tracks a folder (`git init`) and master the three zones every file passes through: **Working Directory → Staging Area → Repository**.
- **Learning Objectives:**
  - Initialize a new local repository using `git init`.
  - Check repository state with `git status`.
  - Stage changes with `git add` and save snapshots with `git commit -m "..."`.
- **Visual Track:** *Learn Git In 15 Minutes* (Colt Steele)
- **Reading Track:** *Saving Changes (`git add` & `git commit`)* (Atlassian Git Tutorials) & *Recording Changes to the Repository* (Pro Git)
- **Practical Task:** Create a folder `hcc-git-practice`, run `git init`, create `hello.txt`, check `git status`, stage with `git add`, and commit it.

#### Day 04 — Inspecting History & Viewing Changes
- **Difficulty:** Beginner
- **Estimated Time:** 25 mins
- **Introduction:** Once you have commits, how do you look back in time and see *what* changed and *who* changed it?
- **Learning Objectives:**
  - View commit history using `git log` and `git log --oneline`.
  - Compare uncommitted edits against the last commit using `git diff`.
  - Write clear, meaningful commit messages instead of `"asdf"` or `"update"`.
- **Visual Track:** *Git Tutorial for Beginners: Learn Git in 1 Hour* (Programming with Mosh — History & Diff sections)
- **Reading Track:** *Git Basics — Viewing the Commit History* (Pro Git / git-scm.com)
- **Practical Task:** Make two edits to `hello.txt`, run `git diff` before staging, commit both edits separately, and inspect history with `git log --oneline`.

#### Day 05 — Undoing Mistakes Safely (`restore`, `reset`, `revert`)
- **Difficulty:** Beginner → Comfortable
- **Estimated Time:** 30 mins
- **Introduction:** Every developer makes mistakes—staging the wrong file, breaking working code, or making a bad commit. Learn how to undo safely without losing work.
- **Learning Objectives:**
  - Unstage a file without losing edits (`git restore --staged <file>`).
  - Discard unwanted local edits (`git restore <file>`).
  - Understand the safe difference between `git reset` (local history) and `git revert` (safe undo commit).
- **Visual Track:** *Git for Beginners: Fixing Bad Commits (Part 3)* (SelfTeach.me) + *Undoing/Reverting/Resetting code changes* (codebasics)
- **Reading Track:** *Git Basics — Undoing Things* (Pro Git / git-scm.com) & *Undoing Changes* (Atlassian Git Tutorials)
- **Practical Task:** Stage a dummy file by mistake, unstage it with `git restore --staged`, then make a commit and safely reverse it with `git revert`.

#### Day 06 — Project Hygiene: `.gitignore` & `README.md`
- **Difficulty:** Beginner
- **Estimated Time:** 25 mins
- **Introduction:** Learn how to keep secrets (`.env`) and heavy dependencies (`node_modules/`) out of Git, and how to write a clean `README.md` that explains your project.
- **Learning Objectives:**
  - Create a `.gitignore` file with wildcard and folder patterns.
  - Understand why secrets/API keys must never be committed.
  - Format a clean `README.md` using GitHub-Flavored Markdown (headings, code blocks, lists).
- **Visual Track:** *Git Tutorial 8: .gitignore file* (codebasics)
- **Reading Track:** *Ignoring files* (GitHub Docs) & *Learn GitHub-Flavored Markdown Syntax* (freeCodeCamp)
- **Practical Task:** Add a `.gitignore` (ignoring `*.log` and `.env`) and a formatted `README.md` to `hcc-git-practice`, then commit both.

---

### Part B: GitHub Fundamentals (Days 7–11)

#### Day 07 — Remote Repositories & Connecting Local to GitHub
- **Difficulty:** Beginner → Intermediate
- **Estimated Time:** 25 mins
- **Introduction:** Move your code from your laptop to the cloud. Learn how local repositories connect to GitHub remotes (`origin`).
- **Learning Objectives:**
  - Create a new repository on GitHub via the web interface.
  - Connect a local repo to GitHub using `git remote add origin <url>`.
  - Verify remote connections with `git remote -v`.
- **Visual Track:** *Git Tutorial 2: What is Github?* (codebasics) & *Git and GitHub for Beginners - Crash Course* (freeCodeCamp — Remote setup section)
- **Reading Track:** *Create a repo* & *About remote repositories* (GitHub Docs)
- **Practical Task:** Create a public repository `hcc-git-practice` on GitHub and link your local repo using `git remote add origin <url>`.

#### Day 08 — Syncing Code: `push`, `clone`, `pull` & `fetch`
- **Difficulty:** Intermediate
- **Estimated Time:** 30 mins
- **Introduction:** Master the four commands that keep your computer and GitHub in sync—whether you're uploading your own code or downloading a teammate's project.
- **Learning Objectives:**
  - Upload local commits with `git push -u origin main`.
  - Download an existing remote repository with `git clone <url>`.
  - Explain the difference between `git fetch` (check/download safely) and `git pull` (`fetch` + `merge`).
- **Visual Track:** *Git Push, Pull and Clone for Beginners: Remotes and GitHub | Git Step by Step #6* (SmallStepsHowTo)
- **Reading Track:** *Cloning a repository* (GitHub Docs) & *Syncing (`git remote`, `fetch`, `pull`, `push`)* (Atlassian Git Tutorials)
- **Practical Task:** Push your `hcc-git-practice` commits to GitHub, edit `README.md` directly on GitHub, and bring that change down locally using `git pull`.

#### Day 09 — Branching Fundamentals
- **Difficulty:** Intermediate
- **Estimated Time:** 30 mins
- **Introduction:** Never break working `main` code! Branches let you build new features or fix bugs in a safe, isolated parallel timeline.
- **Learning Objectives:**
  - Explain why feature branches are standard practice in software teams.
  - Create, list, and switch branches using `git branch`, `git switch -c <name>`, and `git switch <name>`.
  - Understand what `HEAD` points to.
- **Visual Track:** *Git for Beginners: Branching (Part 4)* (SelfTeach.me) + *Interactive Sandbox: Learn Git Branching* (learngitbranching.js.org)
- **Reading Track:** *Git Branching — Branches in a Nutshell* (Pro Git) & *Using Branches* (Atlassian Git Tutorials)
- **Practical Task:** Create a branch `feature/about-me`, add a new file `about.md` and commit it on that branch, then switch back to `main` and observe `about.md` disappear/reappear cleanly.

#### Day 10 — Merging Branches
- **Difficulty:** Intermediate
- **Estimated Time:** 25 mins
- **Introduction:** Once your feature works on its branch, it's time to bring it safely back into `main` and clean up old branches.
- **Learning Objectives:**
  - Merge a feature branch into `main` using `git merge <branch>`.
  - Understand Fast-Forward merges vs 3-Way Merge Commits.
  - Delete completed branches cleanly (`git branch -d <branch>`).
- **Visual Track:** *Git & GitHub Tutorial for Beginners #9 - Merging Branches (& conflicts)* (The Net Ninja)
- **Reading Track:** *Using Branches & Merging* (Atlassian Git Tutorials)
- **Practical Task:** Switch to `main`, merge `feature/about-me` into `main`, delete the feature branch with `git branch -d`, and push `main` to GitHub.

#### Day 11 — Handling & Resolving Merge Conflicts
- **Difficulty:** Intermediate
- **Estimated Time:** 30 mins
- **Introduction:** When two people edit the same line of the same file, Git pauses and asks you to choose. Learn why conflicts are normal and how to resolve them calmly.
- **Learning Objectives:**
  - Understand what causes a merge conflict.
  - Read Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
  - Resolve a conflict manually (or in VS Code), stage the resolved file, and finish the merge commit.
- **Visual Track:** *Git for Beginners: How to Resolve Merge Conflicts (Part 5)* (SelfTeach.me)
- **Reading Track:** *Merge Conflicts* (Atlassian Git Tutorials)
- **Practical Task:** Intentionally edit the same line of `README.md` on two different branches, trigger a merge conflict, resolve it cleanly, and complete the merge commit.

---

### Part C: Real-World Collaboration (Days 12–15)

#### Day 12 — Forking & Upstream Syncing
- **Difficulty:** Intermediate
- **Estimated Time:** 25 mins
- **Introduction:** How do you contribute to a repository you don't own (like an open-source project or a classmate's repo)? You **Fork** it first!
- **Learning Objectives:**
  - Distinguish between **Cloning** a repo vs **Forking** a repo.
  - Configure both `origin` (your fork) and `upstream` (original repo) remotes.
  - Keep a fork up to date with the original repository.
- **Visual Track:** *Git and GitHub for Beginners - Crash Course* (freeCodeCamp — Forking workflow)
- **Reading Track:** *Fork a repo* (GitHub Docs)
- **Practical Task:** Fork a public starter/practice repository on GitHub, clone your fork locally, and check `git remote -v`.

#### Day 13 — Pull Requests (PRs) & Code Reviews
- **Difficulty:** Intermediate
- **Estimated Time:** 30 mins
- **Introduction:** A Pull Request (PR) is how teams propose changes, discuss code quality, and review work before merging into `main`.
- **Learning Objectives:**
  - Push a feature branch to GitHub and open a Pull Request.
  - Write a clear PR title and description explaining *what* changed and *why*.
  - Respond to code review feedback by pushing follow-up commits to the same branch.
- **Visual Track:** *Git for Beginners: Writing and Approving Pull Requests in GitHub (Part 6)* (SelfTeach.me) + *What is Pull Request?* (codebasics)
- **Reading Track:** *About pull requests*, *Creating a pull request*, & *Reviewing proposed changes* (GitHub Docs)
- **Practical Task:** Push a new branch to your own repo (or fork), open a Pull Request on GitHub with a clear summary, review the "Files changed" tab, and merge it.

#### Day 14 — GitHub Issues, Discussions & Team Workflows
- **Difficulty:** Intermediate
- **Estimated Time:** 25 mins
- **Introduction:** Great software teams don't just push code—they track bugs, plan features, and discuss ideas using GitHub Issues and Discussions.
- **Learning Objectives:**
  - Create a structured GitHub Issue (bug report or feature request) with labels.
  - Link an issue to a Pull Request (e.g., `Closes #1`).
  - Understand when to use **Issues** (actionable tasks/bugs) vs **Discussions** (Q&A/ideas) and how the **Feature Branch Workflow** works in hackathons.
- **Visual Track:** *Introduction to GitHub* (Microsoft Learn interactive module)
- **Reading Track:** *About issues* & *About discussions* (GitHub Docs)
- **Practical Task:** Open an Issue in your `hcc-git-practice` repo (e.g., "Add project goals to README"), then open a PR that closes that issue.

#### Day 15 — Capstone: Complete Collaborative Workflow Simulation
- **Difficulty:** Practical / Capstone
- **Estimated Time:** 35 mins
- **Introduction:** Bring everything together! Walk through the complete real-world developer lifecycle from cloning a repo to merging a reviewed Pull Request cleanly.
- **Learning Objectives:**
  - Execute the full end-to-end GitHub Flow: `Issue → Branch → Edit & Commit → Push → Pull Request → Review → Merge → Pull`.
  - Apply best practices (`.gitignore`, clean commits, descriptive PRs, deleting stale branches).
  - Feel confident contributing to HCC projects, team hackathons, and open-source repositories.
- **Visual Track:** *GITHUB PULL REQUEST, Branching, Merging & Team Workflow* (LearnCode.academy)
- **Reading Track:** *Introduction to GitHub* (Microsoft Learn) & *GitHub Skills Interactive Courses* (skills.github.com)
- **Practical Task:** Complete the full end-to-end checklist on your `hcc-git-practice` repository (Issue → Branch → Commit → Push → PR → Merge → Local `git pull`) and optionally share your repo link!

---

## 3. Proposed Discord Announcement & Learning Card Design

Designed specifically for **HCC AutoEngage** (`discord.js` v14), preserving the **dark & HackerRank-green (`#00C853`)** visual identity, restrained formatting, and clean hierarchy without emoji clutter or raw URL dumps.

### Morning Learning Card (Published at Configured Morning Time)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 🟩  HCC DAILY LEARNING  |  DAY 01 OF 15                                 │
│                                                                         │
│ Today's Topic: Version Control & Git vs GitHub                          │
│                                                                         │
│ Learn why developers stopped saving folders like "final_v2.zip" and    │
│ understand the exact difference between Git (local tool) and GitHub     │
│ (cloud platform).                                                       │
│                                                                         │
│ Why it matters: Every software team, hackathon, and open-source         │
│ project relies on version control to collaborate without overwriting    │
│ each other's work.                                                      │
│                                                                         │
│ LEARNING OBJECTIVES                                                     │
│ • Explain what a Version Control System solves                          │
│ • Differentiate Git (local) from GitHub (remote cloud)                  │
│ • Recognize how distributed version control works                       │
│                                                                         │
│ VISUAL LEARNING                                                         │
│ 🎬 Git Explained in 100 Seconds — Fireship (2 mins)                     │
│                                                                         │
│ READ & UNDERSTAND                                                       │
│ 📖 What is Version Control — Atlassian Git Tutorials (8 mins read)      │
│                                                                         │
│ TODAY'S PRACTICAL TASK                                                  │
│ Create a free GitHub account and note 3 ways version control helps      │
│ in team or college projects.                                            │
│                                                                         │
│ ⏱️ Estimated Time: ~20 mins  ·  Evening Quiz tonight at 07:00 PM IST    │
└─────────────────────────────────────────────────────────────────────────┘
  [ ▶ Watch Video (Link) ]   [ 📖 Read Guide (Link) ]
  [ ⬜ Not Started ]  [ 🔄 In Progress ]  [ ✅ Completed ]  [ 🙋 Need Help ]
  [ 📝 Mark Practical Task Done ]
```

### Design Highlights for Phase 3 Integration:
1. **Zero Raw URL Dumps:** Visual & Reading resources use clean Discord `ButtonStyle.Link` buttons (`Watch Video`, `Read Guide`) directly below the embed.
2. **Restrained HCC Branding:** Uses `#00C853` (`COLORS.primary`) sidebar border, crisp typography, and clear uppercase section headers instead of excessive emojis.
3. **Separated Participation vs Knowledge Assessment:** Clicking `In Progress` / `Completed` updates the member's daily learning progress state in Supabase without awarding quiz points; points & XP remain strictly earned via the evening quiz!
4. **Evening Quiz Tie-in:** At evening quiz time, the bot launches the existing `dailyTimedSessionEngine` using only that day's `quiz.json` package, awarding standard `+10 pts / +20 XP` per correct answer and showing explanations.
