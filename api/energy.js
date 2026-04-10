module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { checkin, schedule } = req.body;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const prompt = `You are EnergyOS. Analyze this check-in and return ONLY a JSON object, no other text.

Data: energy=${checkin.energy}/10, mood=${checkin.mood}/10, stress=${checkin.stress}/10, focus=${checkin.focus}/10${checkin.bpm ? ', bpm=' + checkin.bpm : ''}, sleep=${checkin.sleepHours}hrs (${checkin.sleepQuality}), woke=${checkin.wokeUpFeeling}, meal=${checkin.lastMeal} ${checkin.lastMealWhen}, hydration=${checkin.hydration}, caffeine=${checkin.caffeine} ${checkin.caffeineWhen}, nicotine=${checkin.nicotine}, alcohol=${checkin.alcohol}, body=${checkin.physicalFeeling}, sick=${checkin.sick}, last workout=${checkin.lastWorkout}, social battery=${checkin.socialBattery}, motivation=${checkin.motivation}${checkin.notes ? ', notes=' + checkin.notes : ''}

Today is ${today}.${schedule && schedule.commitments ? ' Fixed commitments: ' + schedule.commitments + '. Build schedule around these.' : ''}${schedule && schedule.wakeTime !== 'Not specified' ? ' Wake: ' + schedule.wakeTime + ', Bed: ' + schedule.sleepTime + '.' : ''}

Rules: predict caffeine crashes (peaks 1hr, crashes 4-6hr after); alcohol/nicotine = lower energy; low social battery = no social events; high stress = decompression; sore body = no gym; never deep work if energy+focus both under 5; schedule nap if under 6hrs sleep.

Return this exact JSON:
{"score":75,"summary":"Two sentence summary.","alerts":["alert if any"],"schedule":[{"time":"9:00 AM","activity":"activity name","category":"deep_work","reason":"one sentence"}],"tip":"one tip"}

Categories must be one of: deep_work, light_work, gym, rest, social, food, recovery. Include 5-8 schedule items.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.content || !data.content[0]) {
      return res.status(500).json({ error: 'Anthropic error', detail: JSON.stringify(data).slice(0, 200) });
    }

    const text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: 'No JSON found', raw: text.slice(0, 200) });
    }
    const result = JSON.parse(match[0]);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
