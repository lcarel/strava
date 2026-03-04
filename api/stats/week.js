import { getSession } from '../../lib/session.js';
import { fetchWeekStats } from '../../lib/strava.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  try {
    const data = await fetchWeekStats(session.athleteId);
    res.json(data);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
}
