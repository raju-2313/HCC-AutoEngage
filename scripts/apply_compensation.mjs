/**
 * apply_compensation.mjs
 * Applies bug-fix compensation to all 27 affected members.
 * Also inserts into points_history for a clean audit trail.
 * Uses individual updates (no raw SQL needed via REST API).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const COMPENSATION = [
  {
    discord_id: "1567816071438803054",
    username: "snehal00170",
    pts: 150,
    xp: 300,
  },
  {
    discord_id: "846379972134174730",
    username: "karan20071",
    pts: 120,
    xp: 240,
  },
  {
    discord_id: "1552654083549040642",
    username: "akanksha_4709",
    pts: 120,
    xp: 240,
  },
  {
    discord_id: "1566346476718919800",
    username: "vvglow_07",
    pts: 100,
    xp: 200,
  },
  {
    discord_id: "1563064549593063586",
    username: "sakshammali.",
    pts: 100,
    xp: 200,
  },
  {
    discord_id: "1554487457192345621",
    username: "samiksha_2007",
    pts: 100,
    xp: 200,
  },
  {
    discord_id: "1521821940338266182",
    username: "pranjalmane",
    pts: 100,
    xp: 200,
  },
  {
    discord_id: "1563126658712469585",
    username: "sharadpatil0435_8684",
    pts: 90,
    xp: 180,
  },
  {
    discord_id: "1567817875023073343",
    username: "krishnaacharya08",
    pts: 80,
    xp: 160,
  },
  {
    discord_id: "1563090306570784808",
    username: "bhagymane20",
    pts: 80,
    xp: 160,
  },
  {
    discord_id: "1567806200341340250",
    username: "ranveerpawar0909",
    pts: 70,
    xp: 140,
  },
  {
    discord_id: "1567863965856309268",
    username: "pranitachougule",
    pts: 60,
    xp: 120,
  },
  {
    discord_id: "1567388827201310782",
    username: "danammasharanabasapp",
    pts: 50,
    xp: 100,
  },
  {
    discord_id: "1514542421210435584",
    username: "herobinesiva",
    pts: 40,
    xp: 80,
  },
  {
    discord_id: "1360147081225830430",
    username: "aizen070284",
    pts: 40,
    xp: 80,
  },
  {
    discord_id: "1299298730356244515",
    username: "amogh_mahadik45",
    pts: 40,
    xp: 80,
  },
  {
    discord_id: "1563090797082058752",
    username: "raunakriyajmujawar_5",
    pts: 40,
    xp: 80,
  },
  {
    discord_id: "1552657749123272790",
    username: "ayanshaikh_08",
    pts: 30,
    xp: 60,
  },
  { discord_id: "1551593450518876240", username: "pari_3178", pts: 30, xp: 60 },
  {
    discord_id: "1551519801594351728",
    username: "tanvii.318",
    pts: 30,
    xp: 60,
  },
  {
    discord_id: "1546987472586539019",
    username: "frustratedguy0695",
    pts: 20,
    xp: 40,
  },
  {
    discord_id: "1504466608587018351",
    username: "farheens25",
    pts: 20,
    xp: 40,
  },
  {
    discord_id: "1551586816820256851",
    username: "vaishnavipatil0523",
    pts: 20,
    xp: 40,
  },
  {
    discord_id: "1566785459466670211",
    username: "aditi_mali_24",
    pts: 10,
    xp: 20,
  },
  { discord_id: "1567568095701106901", username: "6072008", pts: 10, xp: 20 },
  { discord_id: "732845497819070466", username: "netineti_", pts: 10, xp: 20 },
  {
    discord_id: "1371482830558728222",
    username: "ajinkya00071",
    pts: 10,
    xp: 20,
  },
];

async function main() {
  console.log("=== Applying Sprint Bug-Fix Compensation ===\n");
  console.log(`Processing ${COMPENSATION.length} members...\n`);

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const c of COMPENSATION) {
    // Step 1: Fetch current member record
    const { data: members, error: fetchErr } = await supabase
      .from("members")
      .select("id, discord_id, username, total_points, total_xp")
      .eq("discord_id", c.discord_id)
      .limit(1);

    if (fetchErr || !members || members.length === 0) {
      console.error(
        `  ❌ ${c.username} (${c.discord_id}): fetch failed — ${fetchErr?.message || "not found"}`,
      );
      failCount++;
      results.push({
        ...c,
        status: "FAIL",
        error: fetchErr?.message || "not found",
      });
      continue;
    }

    const member = members[0];
    const newPts = (member.total_points || 0) + c.pts;
    const newXP = (member.total_xp || 0) + c.xp;

    // Step 2: Update points and XP
    const { error: updateErr } = await supabase
      .from("members")
      .update({
        total_points: newPts,
        total_xp: newXP,
        updated_at: new Date().toISOString(),
      })
      .eq("discord_id", c.discord_id);

    if (updateErr) {
      console.error(`  ❌ ${c.username}: update failed — ${updateErr.message}`);
      failCount++;
      results.push({ ...c, status: "FAIL", error: updateErr.message });
      continue;
    }

    // Step 3: Insert into points_history for audit trail
    const { error: histErr } = await supabase.from("points_history").insert({
      member_id: member.id,
      discord_id: c.discord_id,
      amount: c.pts,
      xp_amount: c.xp,
      reason: `7-Day Sprint bug-fix compensation (Discord interaction timeout — interior gap analysis, ${c.pts / 10} question(s) affected)`,
      awarded_by: "system-auto-compensation",
      created_at: new Date().toISOString(),
    });

    if (histErr) {
      // Not fatal — points are updated, just log the history failure
      console.warn(
        `  ⚠️  ${c.username}: points updated but points_history insert failed — ${histErr.message}`,
      );
    }

    console.log(
      `  ✅ ${c.username.padEnd(24)} | ${member.total_points} → ${newPts} pts  |  ${member.total_xp} → ${newXP} XP  |  +${c.pts} pts, +${c.xp} XP`,
    );
    successCount++;
    results.push({
      ...c,
      old_pts: member.total_points,
      new_pts: newPts,
      old_xp: member.total_xp,
      new_xp: newXP,
      status: "OK",
    });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Success: ${successCount}/${COMPENSATION.length}`);
  if (failCount > 0)
    console.log(`❌ Failed:  ${failCount}/${COMPENSATION.length}`);
  console.log(`${"=".repeat(60)}\n`);

  // Now fetch the full updated leaderboard to verify
  console.log("Fetching verified final leaderboard from DB...\n");

  const { data: attempts, error: aErr } = await supabase
    .from("quiz_attempts")
    .select("discord_id, is_correct")
    .gte("submitted_at", "2026-11-09T00:00:00.000Z")
    .lte("submitted_at", "2026-11-15T23:59:59.000Z");

  const statsByDid = {};
  (attempts || []).forEach((a) => {
    if (!statsByDid[a.discord_id])
      statsByDid[a.discord_id] = { total: 0, correct: 0 };
    statsByDid[a.discord_id].total++;
    if (a.is_correct) statsByDid[a.discord_id].correct++;
  });

  const participantIds = Object.keys(statsByDid);
  let members = [];
  const chunk = 100;
  for (let i = 0; i < participantIds.length; i += chunk) {
    const { data, error } = await supabase
      .from("members")
      .select("discord_id, username, total_points, total_xp")
      .in("discord_id", participantIds.slice(i, i + chunk));
    if (!error) members = members.concat(data || []);
  }

  members.sort((a, b) => {
    if (b.total_points !== a.total_points)
      return b.total_points - a.total_points;
    return b.total_xp - a.total_xp;
  });

  const MEDALS = ["🥇", "🥈", "🥉"];
  console.log(
    "╔═══════════════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║   🏆 VERIFIED FINAL LEADERBOARD (Live DB — Post Compensation) 🏆    ║",
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════════╝",
  );
  console.log(
    `${"Rank".padEnd(5)} ${"Username".padEnd(26)} ${"Pts".padEnd(8)} ${"XP".padEnd(8)} ${"Qs".padEnd(5)} ${"Correct".padEnd(8)} Acc%`,
  );
  console.log("─".repeat(72));

  members.forEach((m, idx) => {
    const rank = idx + 1;
    const medal = MEDALS[idx] || `#${rank}`;
    const s = statsByDid[m.discord_id] || { total: 0, correct: 0 };
    const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    console.log(
      `${medal.padEnd(5)} ${(m.username || "?").substring(0, 26).padEnd(26)} ${String(m.total_points).padEnd(8)} ${String(m.total_xp).padEnd(8)} ${String(s.total).padEnd(5)} ${String(s.correct).padEnd(8)} ${acc}%`,
    );
  });

  console.log("─".repeat(72));
  console.log("\n🏆 TOP 3:");
  members.slice(0, 3).forEach((m, i) => {
    console.log(
      `  ${MEDALS[i]}  ${m.username}  —  ${m.total_points} pts  /  ${m.total_xp} XP`,
    );
  });
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
