export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { checkin, schedule } = req.body;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const scheduleContext = schedule
    ? `
USER'S FIXED SCHEDULE TODAY (${today}):
- Wake time: ${schedule.wakeTime}
- Bedtime: ${schedule.sleepTime}
- Fixed commitments today: ${schedule.commitments || 'None provided'}
Build the schedule strictly around these — never suggest activities during fixed blocks.
`
    : '';

  const prompt = `You are EnergyOS, an AI energy coach. Analyze this check-in data and generate a realistic personalized daily schedule.
${scheduleContext}

CHECK-IN DATA:
How they feel:
- Energy: ${checkin.energy}/10
- Mood: ${checkin.mood}/10
- Stress: ${checkin.stress}/10
- Focus: ${checkin.focus}/10
${checkin.bpm ? `- Heart rate: ${checkin.bpm} BPM` : ''}

Sleep:
- Hours slept: ${checkin.sleepHours}
- Sleep quality: ${checkin.sleepQuality}
- Woke up feeling: ${checkin.wokeUpFeeling}

Food & hydration:
- Last meal: ${checkin.lastMeal}
- Ate: ${checkin.lastMealWhen}
- Hydration: ${checkin.hydration}

Substances (affects energy windows):
- Caffeine: ${checkin.caffeine} — consumed ${checkin.caffeineWhen}
- Nicotine: ${checkin.nicotine}
- Alcohol: ${checkin.alcohol}

Body & recovery:
- Physical feeling: ${checkin.physicalFeeling}
- Sick/unwell: ${checkin.sick}
- Last workout: ${checkin.lastWorkout}

Mental & social:
- Social battery: ${checkin.socialBattery}
- Motivation: ${checkin.motivation}
${checkin.notes ? `- Notes: ${checkin.notes}` : ''}

SCHEDULING RULES:
- Use caffeine timing to predict energy crashes (peaks ~1hr after, crashes ~4-6hrs after)
- Nicotine/alcohol from recently = lower baseline energy
- High BPM at rest = stress/fatigue signal
- Low social battery = no social events, solo work only
- High stress = schedule decompression, no high-stakes tasks
- Sore body = no gym, light movement instead
- Never schedule deep work when energy + focus are both below 5
- Schedule gym only if body feels ready
- Schedule rest/nap if sleep was poor (under 6hrs or bad quality)

Respond in this exact JSON format only, no markdown:
{
  "score": <0-100>,
  "summary": "<2 sentences about their energy state and key factors>",
  "alerts": ["<red flags like dehydration, crash window, alcohol impact>"],
  "schedule": [
    {
      "time": "<e.g. 9:00 AM>",
      "activity": "<specific activity>",
      "category": "<deep_work|light_work|gym|rest|social|food|recovery>",
      "reason": "<1 sentence why this fits their energy>"
    }
  ],
  "tip": "<one specific actionable tip based on their data>"
}`;

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    const result = JSON.parse(match ? match[0] : text);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get AI insights', detail: err.message });
  }
}
