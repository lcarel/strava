import { getSession } from '../../lib/session.js';
import { fetchHistoricalWeekStats, getWeekStart } from '../../lib/strava.js';
import { isPremium } from '../../lib/premium.js';
import { checkPerformanceBadges } from '../../lib/badges.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const premium = await isPremium(session.athleteId);
  // Free: last week only. Premium: last 4 weeks.
  const weeksToFetch = premium ? [1, 2, 3, 4] : [1];

  // Rate limit: 10 req/min (données mises en cache 24h côté serveur)
  const rlKey = `ratelimit:history:${session.athleteId}`;
  const attempts = await redis.incr(rlKey);
  if (attempts === 1) await redis.expire(rlKey, 60);
  if (attempts > 10) return res.status(429).json({ error: 'Trop de requêtes.' });

  try {
    const weeks = await Promise.all(
      weeksToFetch.map(async (weeksBack) => {
        const weekStart = getWeekStart(weeksBack);
        const weekEnd   = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const stats = await fetchHistoricalWeekStats(session.athleteId, weeksBack);
        checkPerformanceBadges(session.athleteId, stats, weekStart.toISOString().slice(0, 10)).catch(console.error);
        return {
          week_start: weekStart.toISOString(),
          week_end:   weekEnd.toISOString(),
          totals:     stats.totals,
          by_sport:   stats.by_sport,
        };
      })
    );

    res.json({ weeks, isPremium: premium });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
