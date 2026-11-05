/**
 * src/scripts/testDatabase.js
 * Safely verifies connection to Supabase and reports table readiness.
 *
 * Usage: node src/scripts/testDatabase.js
 */

import 'dotenv/config';
import { testDatabaseConnection, supabaseAdmin } from '../database/client.js';

async function run() {
  console.log('\n📡 Testing Supabase Database Connection...\n');

  const status = await testDatabaseConnection();

  if (status.ok) {
    console.log('✅ Connection successful!');
    console.log('✅ Database is responsive.');

    // Check presence of all 8 Phase 2 tables
    const tables = [
      'members',
      'quizzes',
      'quiz_questions',
      'quiz_attempts',
      'points_history',
      'leaderboard_snapshots',
      'monthly_rewards',
      'activity_logs',
    ];

    console.log('\nChecking required tables:');
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
      if (error) {
        console.log(`  ❌ ${table.padEnd(25)} (Error: ${error.message})`);
      } else {
        console.log(`  ✅ ${table.padEnd(25)} [Ready]`);
      }
    }
    console.log('');
  } else {
    console.log(`⚠️  Status Code: ${status.code || 'UNKNOWN'}`);
    console.log(`⚠️  Message: ${status.message}\n`);
    if (status.code === 'TABLES_NOT_FOUND') {
      console.log('👉 Next step: Open your Supabase Dashboard -> SQL Editor, and paste the contents of:');
      console.log('   migrations/001_initial_schema.sql\n');
    }
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
