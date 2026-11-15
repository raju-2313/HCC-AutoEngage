/**
 * analyze_attempt_gaps.mjs  (ES Module)
 * 
 * Analyzes all quiz attempts across 7 days (Nov 9-15, 2026)
 * to identify participants who may have experienced interaction failures.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== HCC AutoEngage - 7-Day Sprint Attempt Gap Analysis ===\n');

  // Step 1: Fetch all quiz sessions for Nov 9-15
  console.log('Step 1: Fetching all quiz sessions (Nov 9-15)...');
  const { data: sessions, error: sessErr } = await supabase
    .from('quiz_sessions')
    .select('id, session_date, session_name, status, guild_id')
    .gte('session_date', '2026-11-09')
    .lte('session_date', '2026-11-15')
    .order('session_date', { ascending: true });

  if (sessErr) { console.error('Sessions error:', sessErr); process.exit(1); }
  console.log(`  Found ${sessions.length} sessions`);
  sessions.forEach(s => console.log(`    - ${s.session_date} | ${s.session_name} | id:${s.id}`));
  console.log();

  // Step 2: Fetch all quizzes (questions) for these sessions
  console.log('Step 2: Fetching all quiz questions...');
  const sessionIds = sessions.map(s => s.id);
  const { data: quizzes, error: qErr } = await supabase
    .from('quizzes')
    .select('id, session_id, question_number, correct_answer, status')
    .in('session_id', sessionIds)
    .order('question_number', { ascending: true });

  if (qErr) { console.error('Quizzes error:', qErr); process.exit(1); }
  console.log(`  Found ${quizzes.length} quiz questions\n`);

  const quizById = {};
  quizzes.forEach(q => { quizById[q.id] = q; });

  const quizzesBySession = {};
  quizzes.forEach(q => {
    if (!quizzesBySession[q.session_id]) quizzesBySession[q.session_id] = [];
    quizzesBySession[q.session_id].push(q);
  });

  // Step 3: Fetch ALL quiz attempts
  console.log('Step 3: Fetching all quiz attempts...');
  const quizIds = quizzes.map(q => q.id);
  
  // Supabase IN clause has limits; chunk if needed
  const chunkSize = 200;
  let attempts = [];
  for (let i = 0; i < quizIds.length; i += chunkSize) {
    const chunk = quizIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, member_id, discord_id, is_correct, points_awarded, xp_awarded, submitted_at, answer_given')
      .in('quiz_id', chunk);
    if (error) { console.error('Attempts chunk error:', error); process.exit(1); }
    attempts = attempts.concat(data || []);
  }
  console.log(`  Found ${attempts.length} total attempts\n`);

  // Build maps
  const attemptsByMember = {}; // discord_id -> { quiz_id -> attempt }
  attempts.forEach(a => {
    const did = a.discord_id;
    if (!attemptsByMember[did]) attemptsByMember[did] = {};
    attemptsByMember[did][a.quiz_id] = a;
  });

  // Step 4: Fetch member display names
  console.log('Step 4: Fetching member info...');
  const memberIds = [...new Set(attempts.map(a => a.member_id).filter(Boolean))];
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('id, discord_id, username, display_name, points, xp')
    .in('id', memberIds);

  if (memErr) { console.error('Members error:', memErr); process.exit(1); }
  const memberByDiscordId = {};
  members.forEach(m => { memberByDiscordId[m.discord_id] = m; });
  console.log(`  Found ${members.length} unique members\n`);

  // Step 5: Check activity_logs for errors
  console.log('Step 5: Checking activity_logs for interaction errors...');
  const { data: errLogs, error: logErr } = await supabase
    .from('activity_logs')
    .select('discord_id, action, details, created_at')
    .or('action.ilike.%error%,action.ilike.%fail%,details.ilike.%interaction%,details.ilike.%timeout%')
    .gte('created_at', '2026-11-09T00:00:00.000Z')
    .lte('created_at', '2026-11-15T23:59:59.000Z')
    .order('created_at', { ascending: true });

  if (logErr) {
    console.warn('  activity_logs query warning (table may not have these fields):', logErr.message);
  } else {
    console.log(`  Found ${(errLogs || []).length} error/fail log entries`);
  }

  // Step 6: Analyze gaps
  console.log('\nStep 6: Analyzing attempt gaps per member per session...\n');

  const suspiciousGaps = {}; // discord_id -> [gap entries]

  for (const [did, memberAttempts] of Object.entries(attemptsByMember)) {
    for (const session of sessions) {
      const sessionQuizzes = (quizzesBySession[session.id] || []).sort((a, b) => a.question_number - b.question_number);
      if (sessionQuizzes.length === 0) continue;

      const attemptedInSession = sessionQuizzes.filter(q => memberAttempts[q.id]);
      const notAttemptedInSession = sessionQuizzes.filter(q => !memberAttempts[q.id]);

      if (attemptedInSession.length === 0) continue;
      if (notAttemptedInSession.length === 0) continue;

      const attemptedQNums = attemptedInSession.map(q => q.question_number).sort((a, b) => a - b);
      const notAttemptedQNums = notAttemptedInSession.map(q => q.question_number).sort((a, b) => a - b);

      const minAttempted = Math.min(...attemptedQNums);
      const maxAttempted = Math.max(...attemptedQNums);

      // Interior gaps: missing Qs that fall BETWEEN min and max answered question
      const interiorMissingQNums = notAttemptedQNums.filter(qn => qn > minAttempted && qn < maxAttempted);

      if (interiorMissingQNums.length > 0) {
        if (!suspiciousGaps[did]) suspiciousGaps[did] = [];

        const missingQuizzes = notAttemptedInSession.filter(q => interiorMissingQNums.includes(q.question_number));
        const pointsToAdd = missingQuizzes.length * 10;
        const xpToAdd = missingQuizzes.length * 20;

        // Get correctness stats for answered questions in this session
        const correctInSession = attemptedInSession.filter(q => memberAttempts[q.id]?.is_correct).length;
        const correctRate = attemptedInSession.length > 0 ? (correctInSession / attemptedInSession.length * 100).toFixed(0) : 0;

        suspiciousGaps[did].push({
          session_id: session.id,
          session_date: session.session_date,
          session_name: session.session_name,
          total_questions: sessionQuizzes.length,
          answered_count: attemptedInSession.length,
          correct_answered: correctInSession,
          correct_rate_pct: correctRate,
          answered_q_nums: attemptedQNums,
          missing_interior_q_nums: interiorMissingQNums,
          points_to_add: pointsToAdd,
          xp_to_add: xpToAdd,
        });
      }
    }
  }

  // Step 7: Build final report
  const reportRows = [];

  for (const [did, gaps] of Object.entries(suspiciousGaps)) {
    const member = memberByDiscordId[did];
    const username = member ? (member.display_name || member.username || 'Unknown') : 'Unknown';
    const currentPoints = member ? member.points : 'N/A';
    const currentXP = member ? member.xp : 'N/A';

    const totalPointsToAdd = gaps.reduce((sum, g) => sum + g.points_to_add, 0);
    const totalXpToAdd = gaps.reduce((sum, g) => sum + g.xp_to_add, 0);
    const totalMissingQs = gaps.reduce((sum, g) => sum + g.missing_interior_q_nums.length, 0);

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

  reportRows.sort((a, b) => b.total_points_to_add - a.total_points_to_add);

  // Print
  console.log('='.repeat(130));
  console.log('FINAL REPORT: Participants with Suspicious Answer Gaps (Likely Interaction Failures)');
  console.log('='.repeat(130));
  console.log('NOTE: "Interior gap" = answered Qs before AND after a missing Q (not just trailing unanswered Qs)');
  console.log('      This strongly suggests a mid-session Discord interaction failure, not voluntary skip.\n');

  if (reportRows.length === 0) {
    console.log('✅ No suspicious gaps found — all participants answered consecutive question blocks.\n');
  } else {
    // Summary Table
    console.log('--- SUMMARY TABLE ---');
    const header = 'Discord ID               | Username             | Cur Pts | Cur XP | Days Aff | Missing Qs | Pts+  | XP+';
    console.log(header);
    console.log('-'.repeat(header.length));

    reportRows.forEach(r => {
      const row = [
        r.discord_id.padEnd(24),
        (r.username || '').substring(0, 20).padEnd(20),
        String(r.current_points).padEnd(7),
        String(r.current_xp).padEnd(6),
        String(r.sessions_affected).padEnd(8),
        String(r.total_missing_interior_qs).padEnd(10),
        String(r.total_points_to_add).padEnd(5),
        String(r.total_xp_to_add),
      ].join(' | ');
      console.log(row);
    });

    console.log('\n--- DETAILED BREAKDOWN PER PARTICIPANT ---');
    reportRows.forEach(r => {
      console.log(`\n📌 ${r.username} (Discord ID: ${r.discord_id})`);
      console.log(`   Current Points: ${r.current_points}  |  Current XP: ${r.current_xp}`);
      r.gap_details.forEach(g => {
        console.log(`\n   📅 ${g.session_date} — ${g.session_name}`);
        console.log(`      Answered:        Q${g.answered_q_nums.join(', Q')} (${g.answered_count}/${g.total_questions} total)`);
        console.log(`      Correct answers: ${g.correct_answered}/${g.answered_count} (${g.correct_rate_pct}% accuracy on answered Qs)`);
        console.log(`      Interior gaps:   Q${g.missing_interior_q_nums.join(', Q')} — ${g.missing_interior_q_nums.length} question(s)`);
        console.log(`      Compensation:    +${g.points_to_add} pts, +${g.xp_to_add} XP`);
      });
      console.log(`\n   📊 TOTAL COMPENSATION: +${r.total_points_to_add} pts, +${r.total_xp_to_add} XP`);
    });
  }

  // Save JSON
  writeFileSync('./scripts/gap_analysis_result.json', JSON.stringify({ generated_at: new Date().toISOString(), reportRows, errLogs: errLogs || [] }, null, 2));
  console.log('\n✅ Full JSON saved to ./scripts/gap_analysis_result.json');

  // Print error logs if found
  if (errLogs && errLogs.length > 0) {
    console.log('\n--- ERROR LOGS FROM ACTIVITY_LOGS TABLE ---');
    errLogs.slice(0, 50).forEach(l => {
      console.log(`  ${l.created_at} | ${l.discord_id} | ${l.action} | ${JSON.stringify(l.details || '').substring(0, 100)}`);
    });
  }

  console.log('\n=== Analysis Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
