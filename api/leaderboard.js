import { getSession } from '../lib/session.js';
import { fetchWeekStats, fetchHistoricalWeekStats, getUser, getWeekStart } from '../lib/strava.js';
import { isPremium } from '../lib/premium.js';
import { computePoints } from '../lib/points.js';
import redis from '../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const ALLOWED_METRICS = ['distance', 'time', 'elevation', 'points'];
  const metric = req.query.metric || 'distance';
  if (!ALLOWED_METRICS.includes(metric)) return res.status(400).json({ error: 'Métrique invalide' });

  const week = Math.max(0, Math.min(4, parseInt(req.query.week ?? '0', 10) || 0));
  const premium = await isPremium(session.athleteId);

  if (metric === 'elevation' && !premium) {
    return res.status(403).json({ error: 'Le classement par dénivelé est réservé aux membres Premium.', premiumRequired: true });
  }

  // Free: current week + last week (week 1). Weeks 2-4 require premium.
  if (week > 1 && !premium) {
    return res.status(403).json({ error: 'Les semaines 2 à 4 du classement sont réservées aux membres Premium.', premiumRequired: true });
  }

  try {
    const athleteIds = await redis.smembers('athletes');

    const results = await Promise.all(
      athleteIds.map(async (athleteId) => {
        try {
          const user = await getUser(athleteId);
          if (!user) return null;
          const stats = week === 0
            ? await fetchWeekStats(athleteId)
            : await fetchHistoricalWeekStats(athleteId, week);
          const totals = { ...stats.totals, points: computePoints(stats.totals) };
          return {
            athlete: {
              id: athleteId,
              firstname: user.athlete.firstname,
              lastname: user.athlete.lastname,
              profile_medium: user.athlete.profile_medium,
              city: user.athlete.city,
            },
            totals,
            by_sport: stats.by_sport,
          };
        } catch {
          return null;
        }
      })
    );

    const leaderboard = results
      .filter(Boolean)
      .sort((a, b) => {
        if (metric === 'time')      return b.totals.moving_time - a.totals.moving_time;
        if (metric === 'elevation') return b.totals.elevation   - a.totals.elevation;
        if (metric === 'points')    return b.totals.points      - a.totals.points;
        return b.totals.distance - a.totals.distance;
      });

    res.json({ leaderboard, metric, week_start: getWeekStart(week).toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
