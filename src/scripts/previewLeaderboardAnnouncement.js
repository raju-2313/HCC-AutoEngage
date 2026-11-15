import { getTopMembersByPoints } from '../database/queries/leaderboard.js';
import { supabaseAdmin } from '../database/client.js';

async function preview() {
  const allMembers = await getTopMembersByPoints(30);
  const { data: attempts } = await supabaseAdmin
    .from('quiz_attempts')
    .select('discord_id, is_correct')
    .gte('submitted_at', '2026-11-09T00:00:00.000Z')
    .lte('submitted_at', '2026-11-15T23:59:59.000Z');

  const statsByDid = {};
  (attempts || []).forEach(a => {
    if (!statsByDid[a.discord_id]) statsByDid[a.discord_id] = { total: 0, correct: 0 };
    statsByDid[a.discord_id].total++;
    if (a.is_correct) statsByDid[a.discord_id].correct++;
  });

  const sprintIds = new Set(Object.keys(statsByDid));
  const sprintMembers = allMembers
    .filter(m => sprintIds.has(m.discord_id))
    .sort((a, b) => b.total_points - a.total_points || b.total_xp - a.total_xp);

  const top = sprintMembers.slice(0, 10);
  const RANK_ICONS = ['🥇', '🥈', '🥉'];
  const RANK_LABELS = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };

  const podiumLines = top.slice(0, 3).map((m, i) => {
    const s = statsByDid[m.discord_id] || { total: 0, correct: 0 };
    const acc = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    return `${RANK_ICONS[i]} **${RANK_LABELS[i + 1]}** — <@${m.discord_id}>\n` +
           `┣ **${m.total_points} pts** · ${m.total_xp} XP · ${s.correct}/${s.total} correct (${acc}% acc)`;
  }).join('\n\n');

  const tableRows = top.slice(3).map((m, i) => {
    const rank = i + 4;
    const s = statsByDid[m.discord_id] || { total: 0, correct: 0 };
    const acc = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    return `\`#${String(rank).padStart(2)}\` <@${m.discord_id}> — **${m.total_points} pts** · ${s.correct}/${s.total} ✅ · ${acc}%`;
  }).join('\n');

  console.log('=== RAW MESSAGE CONTENT ===');
  console.log('@everyone\n' + '━'.repeat(36) + '\n🚨  **THE 7-DAY SPRINT HAS CONCLUDED!** 🚨\n' + '━'.repeat(36));
  console.log('\n=== EMBED TITLE ===');
  console.log('🏆  HackerRank Campus Community — 7-Day Sprint Final Results!');
  console.log('\n=== EMBED DESCRIPTION ===');
  console.log(`> **Sprint Period:** Nov 9 – Nov 15, 2026\n> *Official standings and winners for the 7-Day Learning Sprint.*\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`);
  console.log('\n=== FIELD: 🎖️ Podium ===');
  console.log(podiumLines);
  console.log('\n=== FIELD: 📋 Full Rankings (#4 – #10) ===');
  console.log(tableRows);
}

preview().catch(console.error);
