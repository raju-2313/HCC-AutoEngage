/**
 * check_schema.mjs
 * Quick schema discovery script
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // List all tables via information_schema
  const { data, error } = await supabase
    .rpc('get_all_tables')
    .select('*');

  if (error) {
    // Try direct pg_tables query instead
    console.log('RPC failed, trying direct table checks...\n');
  }

  // Check common table names
  const tablesToCheck = [
    'quiz_questions', 'quiz_sessions', 'quizzes', 'quiz_attempts', 
    'members', 'guild_members', 'activity_logs', 'points_history',
    'leaderboard', 'daily_sessions', 'sessions', 'events'
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      const cols = data && data.length > 0 ? Object.keys(data[0]).join(', ') : '(empty table)';
      console.log(`✅ ${table}: ${cols}`);
    }
  }
}

main().catch(console.error);
