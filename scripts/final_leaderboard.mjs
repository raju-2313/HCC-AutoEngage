/**
 * final_leaderboard.mjs
 * Fetches all members who participated in the sprint,
 * applies compensation, and prints the final ranked leaderboard.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Compensation map from gap analysis (discord_id -> { pts, xp })
const COMPENSATION = {
  '1567816071438803054': { pts: 150, xp: 300, username: 'snehal00170' },
  '846379972134174730':  { pts: 120, xp: 240, username: 'karan20071' },
  '1552654083549040642': { pts: 120, xp: 240, username: 'akanksha_4709' },
  '1566346476718919800': { pts: 100, xp: 200, username: 'vvglow_07' },
  '1563064549593063586': { pts: 100, xp: 200, username: 'sakshammali.' },
  '1554487457192345621': { pts: 100, xp: 200, username: 'samiksha_2007' },
  '1521821940338266182': { pts: 100, xp: 200, username: 'pranjalmane' },
  '1563126658712469585': { pts: 90,  xp: 180, username: 'sharadpatil0435_8684' },
  '1567817875023073343': { pts: 80,  xp: 160, username: 'krishnaacharya08' },
  '1563090306570784808': { pts: 80,  xp: 160, username: 'bhagymane20' },
  '1567806200341340250': { pts: 70,  xp: 140, username: 'ranveerpawar0909' },
  '1567863965856309268': { pts: 60,  xp: 120, username: 'pranitachougule' },
  '1567388827201310782': { pts: 50,  xp: 100, username: 'danammasharanabasapp' },
  '1514542421210435584': { pts: 40,  xp: 80,  username: 'herobinesiva' },
  '1360147081225830430': { pts: 40,  xp: 80,  username: 'aizen070284' },
  '1299298730356244515': { pts: 40,  xp: 80,  username: 'amogh_mahadik45' },
  '1563090797082058752': { pts: 40,  xp: 80,  username: 'raunakriyajmujawar_5' },
  '1552657749123272790': { pts: 30,  xp: 60,  username: 'ayanshaikh_08' },
  '1551593450518876240': { pts: 30,  xp: 60,  username: 'pari_3178' },
  '1551519801594351728': { pts: 30,  xp: 60,  username: 'tanvii.318' },
  '1546987472586539019': { pts: 20,  xp: 40,  username: 'frustratedguy0695' },
  '1504466608587018351': { pts: 20,  xp: 40,  username: 'farheens25' },
  '1551586816820256851': { pts: 20,  xp: 40,  username: 'vaishnavipatil0523' },
  '1566785459466670211': { pts: 10,  xp: 20,  username: 'aditi_mali_24' },
  '1567568095701106901': { pts: 10,  xp: 20,  username: '6072008' },
  '732845497819070466':  { pts: 10,  xp: 20,  username: 'netineti_' },
  '1371482830558728222': { pts: 10,  xp: 20,  username: 'ajinkya00071' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

async function main() {
  console.log('Fetching all sprint participants from Supabase...\n');

  // Get all members who attempted at least one quiz in the sprint
  const { data: attempts, error: aErr } = await supabase
    .from('quiz_attempts')
    .select('discord_id, member_id')
    .gte('submitted_at', '2026-11-09T00:00:00.000Z')
    .lte('submitted_at', '2026-11-15T23:59:59.000Z');

  if (aErr) { console.error('Attempts error:', aErr); process.exit(1); }

  const participantDiscordIds = [...new Set(attempts.map(a => a.discord_id).filter(Boolean))];
  console.log(`Total sprint participants: ${participantDiscordIds.length}\n`);

  // Fetch their member records
  const chunkSize = 100;
  let members = [];
  for (let i = 0; i < participantDiscordIds.length; i += chunkSize) {
    const chunk = participantDiscordIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('members')
      .select('id, discord_id, username, total_points, total_xp, level, streak_current, quizzes_completed')
      .in('discord_id', chunk);
    if (error) { console.error('Members error:', error); process.exit(1); }
    members = members.concat(data || []);
  }

  // Count per-member quiz stats from attempts
  const memberStats = {};
  attempts.forEach(a => {
    const did = a.discord_id;
    if (!memberStats[did]) memberStats[did] = { total: 0 };
    memberStats[did].total++;
  });

  // Also get correct count
  const { data: correctAttempts, error: cErr } = await supabase
    .from('quiz_attempts')
    .select('discord_id, is_correct')
    .gte('submitted_at', '2026-11-09T00:00:00.000Z')
    .lte('submitted_at', '2026-11-15T23:59:59.000Z')
    .eq('is_correct', true);

  if (!cErr && correctAttempts) {
    correctAttempts.forEach(a => {
      if (memberStats[a.discord_id]) {
        memberStats[a.discord_id].correct = (memberStats[a.discord_id].correct || 0) + 1;
      }
    });
  }

  // Build leaderboard rows
  const rows = members.map(m => {
    const comp = COMPENSATION[m.discord_id] || { pts: 0, xp: 0 };
    const curPts = m.total_points || 0;
    const curXP  = m.total_xp || 0;
    const finalPts = curPts + comp.pts;
    const finalXP  = curXP + comp.xp;
    const stats = memberStats[m.discord_id] || { total: 0, correct: 0 };
    const accuracy = stats.total > 0 ? Math.round((stats.correct || 0) / stats.total * 100) : 0;

    return {
      discord_id: m.discord_id,
      username: m.username || comp.username || 'Unknown',
      cur_pts: curPts,
      cur_xp: curXP,
      comp_pts: comp.pts,
      comp_xp: comp.xp,
      final_pts: finalPts,
      final_xp: finalXP,
      qs_attempted: stats.total,
      qs_correct: stats.correct || 0,
      accuracy_pct: accuracy,
    };
  });

  // Sort by final_pts DESC, then final_xp DESC as tiebreaker
  rows.sort((a, b) => {
    if (b.final_pts !== a.final_pts) return b.final_pts - a.final_pts;
    return b.final_xp - a.final_xp;
  });

  // Print leaderboard
  console.log('╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          🏆  HCC AutoEngage — 7-Day Sprint FINAL LEADERBOARD (Post Bug-Fix Compensation)  🏆        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`${'Rank'.padEnd(5)} ${'Username'.padEnd(22)} ${'Discord ID'.padEnd(22)} ${'Prev Pts'.padEnd(9)} ${'Comp'.padEnd(7)} ${'FINAL PTS'.padEnd(11)} ${'Final XP'.padEnd(10)} ${'Qs'.padEnd(5)} ${'Correct'.padEnd(8)} ${'Acc%'}`);
  console.log('─'.repeat(118));

  rows.forEach((r, idx) => {
    const rank = idx + 1;
    const medal = MEDALS[idx] || `#${rank}`;
    const compStr = r.comp_pts > 0 ? `+${r.comp_pts}` : '  —  ';
    console.log(
      `${medal.padEnd(5)} ${r.username.substring(0,22).padEnd(22)} ${r.discord_id.padEnd(22)} ${String(r.cur_pts).padEnd(9)} ${compStr.padEnd(7)} ${String(r.final_pts).padEnd(11)} ${String(r.final_xp).padEnd(10)} ${String(r.qs_attempted).padEnd(5)} ${String(r.qs_correct).padEnd(8)} ${r.accuracy_pct}%`
    );
  });

  console.log('─'.repeat(118));
  console.log(`\nTotal participants: ${rows.length}`);
  console.log(`Total compensation applied: ${Object.values(COMPENSATION).reduce((s,c)=>s+c.pts,0)} pts across 27 members`);

  // Show top 3 clearly
  console.log('\n╔══════════════════════════╗');
  console.log('║   🏆 TOP 3 WINNERS 🏆   ║');
  console.log('╚══════════════════════════╝');
  rows.slice(0, 3).forEach((r, idx) => {
    console.log(`${MEDALS[idx]}  ${r.username}  —  ${r.final_pts} pts  (${r.final_xp} XP)`);
  });
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
