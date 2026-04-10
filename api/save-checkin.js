const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth token' });

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { checkin, results } = req.body;

  const { error } = await supabase.from('checkins').insert({
    user_id: user.id,
    checked_in_at: new Date().toISOString(),
    energy: checkin.energy,
    mood: checkin.mood,
    stress: checkin.stress,
    focus: checkin.focus,
    bpm: checkin.bpm ? parseInt(checkin.bpm) : null,
    sleep_hours: checkin.sleepHours,
    sleep_quality: checkin.sleepQuality,
    woke_up_feeling: checkin.wokeUpFeeling,
    last_meal: checkin.lastMeal,
    last_meal_when: checkin.lastMealWhen,
    hydration: checkin.hydration,
    caffeine: checkin.caffeine,
    caffeine_when: checkin.caffeineWhen,
    nicotine: checkin.nicotine,
    alcohol: checkin.alcohol,
    physical_feeling: checkin.physicalFeeling,
    sick: checkin.sick,
    last_workout: checkin.lastWorkout,
    social_battery: checkin.socialBattery,
    motivation: checkin.motivation,
    notes: checkin.notes || '',
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
};
