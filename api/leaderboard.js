import { getSession } from '../lib/session.js';
import { fetchWeekStats, getUser, getWeekStart } from '../lib/strava.js';
import redis from '../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const ALLOWED_METRICS = ['distance', 'time', 'activities', 'elevation'];
  const metric = req.query.metric || 'distance';
  if (!ALLOWED_METRICS.includes(metric)) return res.status(400).json({ error: 'Métrique invalide' });

  try {
    const athleteIds = await redis.smembers('athletes');

    const results = await Promise.all(
      athleteIds.map(async (athleteId) => {
        try {
          const user = await getUser(athleteId);
          if (!user) return null;
          const stats = await fetchWeekStats(athleteId);
          return {
            athlete: {
              id: athleteId,
              firstname: user.athlete.firstname,
              lastname: user.athlete.lastname,
              profile_medium: user.athlete.profile_medium,
              city: user.athlete.city,
            },
            totals: stats.totals,
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
        if (metric === 'time') return b.totals.moving_time - a.totals.moving_time;
        if (metric === 'activities') return b.totals.count - a.totals.count;
        if (metric === 'elevation') return b.totals.elevation - a.totals.elevation;
        return b.totals.distance - a.totals.distance;
      });

    res.json({ leaderboard, metric, week_start: getWeekStart().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
