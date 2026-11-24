/**
 * analyze_attempt_gaps.js
 *
 * Analyzes all quiz attempts across 7 days (Nov 9-15, 2026)
 * to identify participants who may have experienced interaction failures.
 *
 * Strategy:
 * 1. Get all quiz sessions (master sessions) for all 7 days
 * 2. Get all questions per session
 * 3. Get all attempts per participant
 * 4. Find participants who have "gap" patterns (answered Q1,Q2 then skipped Q3,Q4,Q5 then answered Q6)
 *    -- this strongly suggests a mid-session failure, not a deliberate skip
 * 5. Also check activity_logs for any error events
 * 6. Cross-reference points_history to see what was actually awarded
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("=== HCC AutoEngage - 7-Day Sprint Attempt Gap Analysis ===\n");

  // Step 1: Fetch all quiz sessions for Nov 9-15
  console.log("Step 1: Fetching all quiz sessions (Nov 9-15)...");
  const { data: sessions, error: sessErr } = await supabase
    .from("quiz_sessions")
    .select("id, session_date, session_name, status, guild_id")
    .gte("session_date", "2026-11-09")
    .lte("session_date", "2026-11-15")
    .order("session_date", { ascending: true });

  if (sessErr) {
    console.error("Sessions error:", sessErr);
    process.exit(1);
  }
  console.log(`  Found ${sessions.length} sessions\n`);

  // Step 2: Fetch all quizzes (questions) for these sessions
  console.log("Step 2: Fetching all quiz questions...");
  const sessionIds = sessions.map((s) => s.id);
  const { data: quizzes, error: qErr } = await supabase
    .from("quizzes")
    .select("id, session_id, question_number, correct_answer, status")
    .in("session_id", sessionIds)
    .order("question_number", { ascending: true });

  if (qErr) {
    console.error("Quizzes error:", qErr);
    process.exit(1);
  }
  console.log(`  Found ${quizzes.length} quiz questions\n`);

  // Build maps
  const sessionById = {};
  sessions.forEach((s) => {
    sessionById[s.id] = s;
  });

  // quizzesBySession: { session_id -> [quiz, ...] sorted by question_number }
  const quizzesBySession = {};
  quizzes.forEach((q) => {
    if (!quizzesBySession[q.session_id]) quizzesBySession[q.session_id] = [];
    quizzesBySession[q.session_id].push(q);
  });

  // Step 3: Fetch ALL quiz attempts
  console.log("Step 3: Fetching all quiz attempts...");
  const { data: attempts, error: attErr } = await supabase
    .from("quiz_attempts")
    .select(
      "id, quiz_id, member_id, discord_id, is_correct, points_awarded, xp_awarded, submitted_at, answer_given",
    )
    .in(
      "quiz_id",
      quizzes.map((q) => q.id),
    );

  if (attErr) {
    console.error("Attempts error:", attErr);
    process.exit(1);
  }
  console.log(`  Found ${attempts.length} total attempts\n`);

  // Build maps: quizById, attemptsByMemberByQuiz
  const quizById = {};
  quizzes.forEach((q) => {
    quizById[q.id] = q;
  });

  // attemptsByMember: { discord_id -> { quiz_id -> attempt } }
  const attemptsByMember = {};
  const memberInfo = {}; // discord_id -> { member_id }

  attempts.forEach((a) => {
    const did = a.discord_id;
    if (!attemptsByMember[did]) attemptsByMember[did] = {};
    attemptsByMember[did][a.quiz_id] = a;
    if (!memberInfo[did]) memberInfo[did] = { member_id: a.member_id };
  });

  // Step 4: Fetch member display names
  console.log("Step 4: Fetching member info...");
  const memberIds = [
    ...new Set(attempts.map((a) => a.member_id).filter(Boolean)),
  ];
  const { data: members, error: memErr } = await supabase
    .from("members")
    .select("id, discord_id, username, display_name, points, xp")
    .in("id", memberIds);

  if (memErr) {
    console.error("Members error:", memErr);
    process.exit(1);
  }

  const memberByDiscordId = {};
  members.forEach((m) => {
    memberByDiscordId[m.discord_id] = m;
  });
  console.log(`  Found ${members.length} unique members\n`);

  // Step 5: Check activity_logs for errors
  console.log("Step 5: Checking activity_logs for interaction errors...");
  const { data: errLogs, error: logErr } = await supabase
    .from("activity_logs")
    .select("discord_id, action, details, created_at")
    .or(
      "action.ilike.%error%,action.ilike.%fail%,details.ilike.%interaction%,details.ilike.%timeout%",
    )
    .gte("created_at", "2026-11-09T00:00:00.000Z")
    .lte("created_at", "2026-11-15T23:59:59.000Z")
    .order("created_at", { ascending: true });

  if (logErr) {
    console.warn(
      "  activity_logs query error (may not exist):",
      logErr.message,
    );
  } else {
    console.log(`  Found ${(errLogs || []).length} error/fail log entries\n`);
  }

  // Step 6: Analyze gaps per session per member
  console.log("Step 6: Analyzing attempt gaps...\n");

  // For each member, for each session, check which questions they answered
  // A "gap" = member answered some questions in a session but NOT consecutive ones
  // We consider it suspicious if:
  //   - Member answered ≥ 2 questions in a session AND
  //   - They are missing questions that are BETWEEN answered questions (i.e., not just trailing questions)

  const suspiciousGaps = {}; // discord_id -> [{ session_date, session_name, missing_q_numbers, points_to_add, xp_to_add }]

  const allDiscordIds = Object.keys(attemptsByMember);

  for (const did of allDiscordIds) {
    const memberAttempts = attemptsByMember[did]; // { quiz_id -> attempt }

    for (const session of sessions) {
      const sessionQuizzes = quizzesBySession[session.id] || [];
      if (sessionQuizzes.length === 0) continue;

      // Which quiz_ids did this member attempt in this session?
      const attemptedInSession = sessionQuizzes.filter(
        (q) => memberAttempts[q.id],
      );
      const notAttemptedInSession = sessionQuizzes.filter(
        (q) => !memberAttempts[q.id],
      );

      if (attemptedInSession.length === 0) continue; // didn't participate in this session at all
      if (notAttemptedInSession.length === 0) continue; // answered all questions, no gaps

      // Sort by question_number
      const attemptedQNums = attemptedInSession
        .map((q) => q.question_number)
        .sort((a, b) => a - b);
      const notAttemptedQNums = notAttemptedInSession
        .map((q) => q.question_number)
        .sort((a, b) => a - b);

      const minAttempted = Math.min(...attemptedQNums);
      const maxAttempted = Math.max(...attemptedQNums);

      // "Interior gap" = a missing question whose number is BETWEEN minAttempted and maxAttempted
      const interiorMissingQNums = notAttemptedQNums.filter(
        (qn) => qn > minAttempted && qn < maxAttempted,
      );

      // Also flag: member answered questions after a gap (gap + continued = suspicious)
      // e.g., answered Q1,Q2 missing Q3,Q4 then answered Q5,Q6
      // This is captured by interiorMissingQNums

      if (interiorMissingQNums.length > 0) {
        if (!suspiciousGaps[did]) suspiciousGaps[did] = [];

        // For each missing interior question, we don't know if they would have gotten it right
        // Conservative approach: We award points only if the question's correct answer
        // aligns with what we can infer (we can't know for certain)
        // We will flag these for admin review and suggest awarding for ALL interior gaps
        // (since the interaction error prevents us from knowing the answer)

        const missingQuizzes = notAttemptedInSession.filter((q) =>
          interiorMissingQNums.includes(q.question_number),
        );

        // Points: 10 pts + 20 XP per question (standard quiz award)
        const pointsToAdd = missingQuizzes.length * 10;
        const xpToAdd = missingQuizzes.length * 20;

        suspiciousGaps[did].push({
          session_id: session.id,
          session_date: session.session_date,
          session_name: session.session_name,
          total_questions: sessionQuizzes.length,
          answered_count: attemptedInSession.length,
          answered_q_nums: attemptedQNums,
          missing_interior_q_nums: interiorMissingQNums,
          points_to_add: pointsToAdd,
          xp_to_add: xpToAdd,
        });
      }
    }
  }

  // Step 7: Build final report
  console.log(
    "=== FINAL REPORT: Participants with Suspicious Answer Gaps ===\n",
  );
  console.log(
    "(These users answered questions on BOTH sides of a gap — indicating a likely interaction failure mid-session)\n",
  );

  const reportRows = [];

  for (const [did, gaps] of Object.entries(suspiciousGaps)) {
    const member = memberByDiscordId[did];
    const username = member
      ? member.display_name || member.username || "Unknown"
      : "Unknown";
    const currentPoints = member ? member.points : "N/A";
    const currentXP = member ? member.xp : "N/A";

    const totalPointsToAdd = gaps.reduce((sum, g) => sum + g.points_to_add, 0);
    const totalXpToAdd = gaps.reduce((sum, g) => sum + g.xp_to_add, 0);
    const totalMissingQs = gaps.reduce(
      (sum, g) => sum + g.missing_interior_q_nums.length,
      0,
    );

    reportRows.push({
      discord_id: did,
      username,
      current_points: currentPoints,
      current_xp: currentXP,
      sessions_affected: gaps.length,
      total_missing_interior_qs: totalMissingQs,
      total_points_to_add: totalPointsToAdd,
      total_xp_to_add: totalXpToAdd,
      gap_details: gaps,
    });
  }

  // Sort by total_points_to_add descending
  reportRows.sort((a, b) => b.total_points_to_add - a.total_points_to_add);

  // Print summary table
  console.log("--- SUMMARY TABLE ---");
  console.log(
    "Discord ID\t\t\tUsername\t\tCurrent Pts\tSessions Affected\tMissing Qs\tPoints to Add\tXP to Add",
  );
  console.log("-".repeat(140));

  reportRows.forEach((r) => {
    console.log(
      `${r.discord_id}\t${r.username.padEnd(20)}\t${String(r.current_points).padEnd(12)}\t${r.sessions_affected}\t\t\t${r.total_missing_interior_qs}\t\t${r.total_points_to_add}\t\t${r.total_xp_to_add}`,
    );
  });

  console.log("\n--- DETAILED BREAKDOWN ---");
  reportRows.forEach((r) => {
    console.log(`\n📌 ${r.username} (${r.discord_id})`);
    r.gap_details.forEach((g) => {
      console.log(`  📅 ${g.session_date} - ${g.session_name}`);
      console.log(`     Answered: Q${g.answered_q_nums.join(", Q")}`);
      console.log(
        `     Missing Interior: Q${g.missing_interior_q_nums.join(", Q")}`,
      );
      console.log(
        `     Compensation: +${g.points_to_add} pts, +${g.xp_to_add} XP`,
      );
    });
  });

  // Also output JSON for further processing
  const outputPath = "./scripts/gap_analysis_result.json";
  const fs = require("fs");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ reportRows, errLogs: errLogs || [] }, null, 2),
  );
  console.log(`\n✅ Full JSON saved to ${outputPath}`);

  // Step 8: Also check activity_logs for any quiz_error or interaction_failed entries
  if (errLogs && errLogs.length > 0) {
    console.log("\n--- ERROR LOGS FROM ACTIVITY_LOGS TABLE ---");
    errLogs.forEach((l) => {
      console.log(
        `  ${l.created_at} | ${l.discord_id} | ${l.action} | ${JSON.stringify(l.details)}`,
      );
    });
  }

  console.log("\n=== Analysis Complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
