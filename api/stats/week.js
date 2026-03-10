import { getSession } from '../../lib/session.js';
import { fetchWeekStats } from '../../lib/strava.js';
import { checkPerformanceBadges } from '../../lib/badges.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  // Rate limit: 30 requests per minute per athlete
  const rlKey = `ratelimit:stats:${session.athleteId}`;
  const attempts = await redis.incr(rlKey);
  if (attempts === 1) await redis.expire(rlKey, 60);
  if (attempts > 30) return res.status(429).json({ error: 'Trop de requêtes, réessaie dans une minute.' });

  try {
    const data = await fetchWeekStats(session.athleteId);
    // Fire-and-forget — badge checks don't block the response
    checkPerformanceBadges(session.athleteId, data).catch(console.error);
    res.json(data);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
