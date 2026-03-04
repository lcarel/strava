import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const leagueIds = await redis.smembers(`athlete:${session.athleteId}:leagues`);

  const leagues = await Promise.all(
    leagueIds.map(async (id) => {
      const league = await redis.get(`league:${id}`);
      if (!league) return null;
      const memberCount = await redis.scard(`league:${id}:members`);
      const rank = await getMemberRank(id, session.athleteId);
      return { ...league, memberCount, rank };
    })
  );

  res.json({ leagues: leagues.filter(Boolean) });
}

async function getMemberRank(leagueId, athleteId) {
  try {
    const { fetchWeekStats } = await import('../../lib/strava.js');
    const memberIds = await redis.smembers(`league:${leagueId}:members`);
    const results = await Promise.all(
      memberIds.map(async (id) => {
        try {
          const s = await fetchWeekStats(id);
          return { id, distance: s.totals.distance };
        } catch { return { id, distance: 0 }; }
      })
    );
    results.sort((a, b) => b.distance - a.distance);
    const idx = results.findIndex(r => r.id === athleteId);
    return idx === -1 ? null : idx + 1;
  } catch { return null; }
}
