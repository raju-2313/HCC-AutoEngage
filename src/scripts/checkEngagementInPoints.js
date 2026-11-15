import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Check reasons in points_history
  const { data: reasons, error } = await supabase
    .from('points_history')
    .select('reason, amount')
    .limit(1000);

  if (error) {
    console.error('Error fetching points_history:', error);
  } else {
    const counts = {};
    reasons.forEach(r => {
      const prefix = (r.reason || 'none').split(':')[0].substring(0, 40);
      counts[prefix] = (counts[prefix] || 0) + 1;
    });
    console.log('Points History Reason categories:', counts);
  }

  // Check voice_sessions or engagement tables
  const tables = ['voice_sessions', 'member_engagement_daily', 'activity_logs'];
  for (const t of tables) {
    const { count, error: err } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: ${count} rows (err: ${err?.message || 'none'})`);
  }
}

check().catch(console.error);
