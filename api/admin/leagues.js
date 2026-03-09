import { requireAdmin } from './middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const athleteIds = await redis.smembers('athletes');

    // Collect all unique league IDs across all athletes
    const leagueIdSets = await Promise.all(
      athleteIds.map(id => redis.smembers(`athlete:${id}:leagues`))
    );
    const uniqueLeagueIds = [...new Set(leagueIdSets.flat())];

    const leagues = await Promise.all(
      uniqueLeagueIds.map(async (id) => {
        const league = await redis.get(`league:${id}`);
        if (!league) return null;
        const memberCount = await redis.scard(`league:${id}:members`);
        return { ...league, memberCount };
      })
    );

    return res.json({ leagues: leagues.filter(Boolean) });
  }

  if (req.method === 'DELETE') {
    const { leagueId } = req.body;
    if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

    const league = await redis.get(`league:${leagueId}`);
    if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

    // Remove league from all members' sets
    const memberIds = await redis.smembers(`league:${leagueId}:members`);
    for (const memberId of memberIds) {
      await redis.srem(`athlete:${memberId}:leagues`, leagueId);
    }

    // Delete league data
    await redis.del(`code:${league.code}`);
    await redis.del(`league:${leagueId}:members`);
    await redis.del(`league:${leagueId}`);

    return res.json({ ok: true });
  }

  res.status(405).end();
}
