import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkVoiceAndChannels() {
  const { data: voiceHistory } = await supabase
    .from('points_history')
    .select('*')
    .eq('reason', 'voice_study_session');
  console.log('Voice history records:', voiceHistory);

  const { data: channels } = await supabase
    .from('engagement_channel_settings')
    .select('*');
  console.log('Engagement channel settings:', channels);

  // Check RPC record_engagement_event or function definitions if possible
  const { data: membersWithMore } = await supabase
    .from('members')
    .select('username, discord_id, total_points, total_xp')
    .gt('total_points', 0)
    .order('total_points', { ascending: false });

  console.log('Total members with points > 0:', membersWithMore.length);
}

checkVoiceAndChannels().catch(console.error);
