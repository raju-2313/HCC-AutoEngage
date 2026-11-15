import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAllPoints() {
  console.log('--- Checking all records in points_history ---');
  const { data: allHistory, error } = await supabase
    .from('points_history')
    .select('reason, amount, xp_amount, discord_id, created_at');

  if (error) {
    console.error(error);
    return;
  }

  const byReason = {};
  const byUser = {};

  allHistory.forEach(h => {
    const r = h.reason || 'unspecified';
    byReason[r] = (byReason[r] || 0) + 1;

    if (!byUser[h.discord_id]) byUser[h.discord_id] = { total_pts: 0, reasons: {} };
    byUser[h.discord_id].total_pts += h.amount;
    const cat = r.split(':')[0].substring(0, 30);
    byUser[h.discord_id].reasons[cat] = (byUser[h.discord_id].reasons[cat] || 0) + h.amount;
  });

  console.log('Total history records:', allHistory.length);
  console.log('Unique reasons:', Object.keys(byReason));
  console.log('\nTop 5 users history breakdown:');
  const sorted = Object.entries(byUser).sort((a,b) => b[1].total_pts - a[1].total_pts).slice(0, 5);
  console.log(JSON.stringify(sorted, null, 2));

  // Also check voice_sessions
  const { data: vs } = await supabase.from('voice_sessions').select('*');
  console.log('\nVoice sessions count:', vs?.length);
  if (vs && vs.length > 0) {
    console.log('Sample voice session:', vs[0]);
  }

  // Also check engagement_channel_settings
  const { data: ch } = await supabase.from('engagement_channel_settings').select('*');
  console.log('\nEngagement channel settings count:', ch?.length);
}

inspectAllPoints().catch(console.error);
