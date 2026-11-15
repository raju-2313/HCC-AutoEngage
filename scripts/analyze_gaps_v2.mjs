/**
 * analyze_gaps_v2.mjs  (ES Module)
 * Uses correct schema: quizzes, quiz_questions, quiz_attempts, members, activity_logs
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== HCC AutoEngage - 7-Day Sprint Attempt Gap Analysis v2 ===\n');

  // Step 1: Get all quizzes from the sprint period (Nov 9-15 2026)
  // The quiz was scheduled daily at 7PM IST — check scheduled_for or published_at
  console.log('Step 1: Fetching all quizzes from Nov 9-15...');
  const { data: quizzes, error: qErr } = await supabase
    .from('quizzes')
    .select('id, title, description, category, difficulty, status, scheduled_for, published_at, closed_at, discord_message_id, discord_channel_id, points_reward, xp_reward, created_at')
    .gte('created_at', '2026-11-09T00:00:00.000Z')
    .lte('created_at', '2026-11-15T23:59:59.000Z')
    .order('created_at', { ascending: true });

  if (qErr) { console.error('Quizzes error:', qErr); process.exit(1); }
  console.log(`  Found ${quizzes.length} quizzes`);

  // Show quiz distribution by day
  const quizzesByDay = {};
  quizzes.forEach(q => {
    const day = (q.scheduled_for || q.published_at || q.created_at || '').substring(0, 10);
    if (!quizzesByDay[day]) quizzesByDay[day] = [];
    quizzesByDay[day].push(q);
  });
  Object.entries(quizzesByDay).sort().forEach(([day, qs]) => {
    console.log(`    ${day}: ${qs.length} quizzes`);
  });
  console.log();

  // Step 2: Get all quiz questions
  console.log('Step 2: Fetching all quiz questions...');
  const quizIds = quizzes.map(q => q.id);
  
  let questions = [];
  const chunkSize = 100;
  for (let i = 0; i < quizIds.length; i += chunkSize) {
    const chunk = quizIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('id, quiz_id, question_text, correct_option, order_index')
      .in('quiz_id', chunk)
      .order('order_index', { ascending: true });
    if (error) { console.error('Questions chunk error:', error); process.exit(1); }
    questions = questions.concat(data || []);
  }
  console.log(`  Found ${questions.length} total questions\n`);

  // Step 3: Fetch ALL quiz attempts for these quizzes
  console.log('Step 3: Fetching all quiz attempts...');
  
  // Note: quiz_attempts references quiz_id which is the quiz ID
  // Also note: we need to handle the fact that each quiz = one question (10 quizzes per day)
  let attempts = [];
  for (let i = 0; i < quizIds.length; i += chunkSize) {
    const chunk = quizIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, member_id, discord_id, selected_option, is_correct, points_awarded, xp_awarded, submitted_at')
      .in('quiz_id', chunk)
      .order('submitted_at', { ascending: true });
    if (error) { console.error('Attempts chunk error:', error); process.exit(1); }
    attempts = attempts.concat(data || []);
  }
  console.log(`  Found ${attempts.length} total attempts\n`);

  // Step 4: Fetch member info
  console.log('Step 4: Fetching member info...');
  const memberIds = [...new Set(attempts.map(a => a.member_id).filter(Boolean))];
  
  let members = [];
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    const chunk = memberIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('members')
      .select('id, discord_id, username, total_points, total_xp, level, quizzes_completed, streak_current')
      .in('id', chunk);
    if (error) { console.error('Members chunk error:', error); process.exit(1); }
    members = members.concat(data || []);
  }

  const memberByDiscordId = {};
  members.forEach(m => { memberByDiscordId[m.discord_id] = m; });
  console.log(`  Found ${members.length} unique members\n`);

  // Step 5: Check activity_logs
  console.log('Step 5: Checking activity_logs for error entries...');
  const { data: errLogs, error: logErr } = await supabase
    .from('activity_logs')
    .select('action_type, actor_discord_id, details, created_at')
    .or('action_type.ilike.%error%,action_type.ilike.%fail%')
    .gte('created_at', '2026-11-09T00:00:00.000Z')
    .lte('created_at', '2026-11-15T23:59:59.000Z')
    .order('created_at', { ascending: true });

  if (logErr) {
    console.warn('  activity_logs warning:', logErr.message);
  } else {
    console.log(`  Found ${(errLogs || []).length} error/fail entries in activity_logs`);
  }

  // Step 6: Build the gap analysis
  // 
  // Architecture understanding:
  // - Each quiz is ONE QUESTION (10 quizzes per day = 10 questions)
  // - quiz_attempts has one row per member per quiz they attempted
  // - We group quizzes by day, sort by scheduled_for/created_at order_index
  // - For each day, check which quiz IDs a member attempted
  // - Identify "interior gaps" = quizzes the member skipped but answered before AND after

  console.log('\nStep 6: Analyzing gaps per member per day...\n');

  // Group quizzes by day, sorted by time (order = question order)
  const quizzesByDaySorted = {};
  quizzes.forEach(q => {
    const day = (q.scheduled_for || q.published_at || q.created_at || '').substring(0, 10);
    if (!quizzesByDaySorted[day]) quizzesByDaySorted[day] = [];
    quizzesByDaySorted[day].push(q);
  });
  // Sort each day's quizzes by created_at / scheduled_for chronologically
  Object.keys(quizzesByDaySorted).forEach(day => {
    quizzesByDaySorted[day].sort((a, b) => {
      const ta = new Date(a.scheduled_for || a.created_at).getTime();
      const tb = new Date(b.scheduled_for || b.created_at).getTime();
      return ta - tb;
    });
    // Assign position index (1-based = question number)
    quizzesByDaySorted[day].forEach((q, idx) => { q._pos = idx + 1; });
  });

  // Build attemptsByMember: discord_id -> { quiz_id -> attempt }
  const attemptsByMember = {};
  attempts.forEach(a => {
    const did = a.discord_id;
    if (!attemptsByMember[did]) attemptsByMember[did] = {};
    attemptsByMember[did][a.quiz_id] = a;
  });

  const suspiciousGaps = {}; // discord_id -> [gap entries]

  for (const [did, memberAttempts] of Object.entries(attemptsByMember)) {
    for (const [day, dayQuizzes] of Object.entries(quizzesByDaySorted)) {
      if (dayQuizzes.length === 0) continue;

      // Which quizzes did this member attempt today?
      const attemptedToday = dayQuizzes.filter(q => memberAttempts[q.id]);
      const notAttemptedToday = dayQuizzes.filter(q => !memberAttempts[q.id]);

      if (attemptedToday.length === 0) continue; // didn't participate today
      if (notAttemptedToday.length === 0) continue; // perfect participation today

      const attemptedPositions = attemptedToday.map(q => q._pos);
      const notAttemptedPositions = notAttemptedToday.map(q => q._pos);

      const minPos = Math.min(...attemptedPositions);
      const maxPos = Math.max(...attemptedPositions);

      // Interior gaps = skipped Qs between min and max answered
      const interiorMissing = notAttemptedPositions.filter(p => p > minPos && p < maxPos);

      if (interiorMissing.length > 0) {
        if (!suspiciousGaps[did]) suspiciousGaps[did] = [];

        const correctToday = attemptedToday.filter(q => memberAttempts[q.id]?.is_correct).length;
        const correctRate = attemptedToday.length > 0 ? (correctToday / attemptedToday.length * 100).toFixed(0) : 0;

        const missingQuizObjs = notAttemptedToday.filter(q => interiorMissing.includes(q._pos));
        const pointsToAdd = missingQuizObjs.length * (dayQuizzes[0]?.points_reward || 10);
        const xpToAdd = missingQuizObjs.length * (dayQuizzes[0]?.xp_reward || 20);

        suspiciousGaps[did].push({
          day,
          total_qs: dayQuizzes.length,
          answered_positions: attemptedPositions.sort((a,b)=>a-b),
          answered_count: attemptedToday.length,
          correct_answered: correctToday,
          correct_rate_pct: correctRate,
          missing_interior_positions: interiorMissing.sort((a,b)=>a-b),
          missing_quiz_titles: missingQuizObjs.map(q => q.title || q.description || `Q${q._pos}`),
          points_to_add: pointsToAdd,
          xp_to_add: xpToAdd,
        });
      }
    }
  }

  // Step 7: Compile report
  const reportRows = [];

  for (const [did, gaps] of Object.entries(suspiciousGaps)) {
    const member = memberByDiscordId[did];
    const username = member ? (member.username || 'Unknown') : 'Unknown';
    const curPts = member ? member.total_points : 'N/A';
    const curXP = member ? member.total_xp : 'N/A';

    const totalPtsAdd = gaps.reduce((s, g) => s + g.points_to_add, 0);
    const totalXPAdd = gaps.reduce((s, g) => s + g.xp_to_add, 0);
    const totalMissing = gaps.reduce((s, g) => s + g.missing_interior_positions.length, 0);

    reportRows.push({
      discord_id: did,
      username,
      current_points: curPts,
      current_xp: curXP,
      days_affected: gaps.length,
      total_missing_qs: totalMissing,
      total_points_to_add: totalPtsAdd,
      total_xp_to_add: totalXPAdd,
      gap_details: gaps,
    });
  }

  reportRows.sort((a, b) => b.total_points_to_add - a.total_points_to_add);

  // Output
  console.log('='.repeat(130));
  console.log('FINAL REPORT: Participants with Mid-Session Answer Gaps (Likely Discord Interaction Failures)');
  console.log('='.repeat(130));
  console.log('Logic: "Interior gap" = member answered BEFORE and AFTER a question but skipped it in the middle');
  console.log('       This is statistically consistent with Discord 3s ACK timeout causing "This interaction failed"\n');

  if (reportRows.length === 0) {
    console.log('✅ No suspicious interior gaps detected across all 7 days.\n');
    console.log('All participants either:');
    console.log('  - Answered all questions in a session, or');
    console.log('  - Only answered a contiguous leading block (which could be normal dropout, not an error)\n');
  } else {
    // Summary table
    const hdr = 'No | Discord ID               | Username             | Cur Pts | Cur XP | Days Hit | Miss Qs | Pts+ | XP+';
    console.log(hdr);
    console.log('-'.repeat(hdr.length));
    reportRows.forEach((r, idx) => {
      console.log(
        `${String(idx+1).padStart(2)} | ${r.discord_id.padEnd(23)} | ${(r.username||'').substring(0,20).padEnd(20)} | ${String(r.current_points).padEnd(7)} | ${String(r.current_xp).padEnd(6)} | ${String(r.days_affected).padEnd(8)} | ${String(r.total_missing_qs).padEnd(7)} | ${String(r.total_points_to_add).padEnd(4)} | ${r.total_xp_to_add}`
      );
    });

    console.log('\n--- DETAILED BREAKDOWN ---');
    reportRows.forEach((r, idx) => {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`#${idx+1} | ${r.username} | Discord: ${r.discord_id}`);
      console.log(`     Current Score: ${r.current_points} pts, ${r.current_xp} XP`);
      r.gap_details.forEach(g => {
        console.log(`\n     📅 ${g.day}`);
        console.log(`        Answered: Q${g.answered_positions.join(', Q')}  (${g.answered_count}/${g.total_qs})`);
        console.log(`        Correct:  ${g.correct_answered}/${g.answered_count} (${g.correct_rate_pct}% accuracy on answered)`);
        console.log(`        GAP:      Q${g.missing_interior_positions.join(', Q')} — ${g.missing_interior_positions.length} missing`);
        console.log(`        Titles:   ${g.missing_quiz_titles.join(' | ')}`);
        console.log(`        Award:    +${g.points_to_add} pts, +${g.xp_to_add} XP`);
      });
      console.log(`\n     ★ TOTAL COMPENSATION: +${r.total_points_to_add} pts, +${r.total_xp_to_add} XP`);
      console.log(`     ★ PROJECTED SCORE AFTER FIX: ${(r.current_points || 0) + r.total_points_to_add} pts, ${(r.current_xp || 0) + r.total_xp_to_add} XP`);
    });
  }

  // Also check activity_logs errors
  if (errLogs && errLogs.length > 0) {
    console.log('\n--- ERROR LOG ENTRIES (activity_logs) ---');
    errLogs.slice(0, 100).forEach(l => {
      const detStr = typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '');
      console.log(`  ${(l.created_at||'').substring(0,19)} | ${l.actor_discord_id||'?'} | ${l.action_type} | ${detStr.substring(0,120)}`);
    });
  }

  // Save results
  const result = {
    generated_at: new Date().toISOString(),
    sprint_days: Object.keys(quizzesByDaySorted).sort(),
    total_quizzes: quizzes.length,
    total_attempts: attempts.length,
    total_members: members.length,
    affected_members_count: reportRows.length,
    reportRows,
    error_logs: errLogs || [],
  };
  writeFileSync('./scripts/gap_analysis_result.json', JSON.stringify(result, null, 2));
  console.log('\n✅ Full JSON saved to ./scripts/gap_analysis_result.json');
  console.log('=== Analysis Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
