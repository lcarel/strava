import { requireAdmin } from './middleware.js';
import { getUser } from '../../lib/strava.js';
import { isPremium } from '../../lib/premium.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const athleteIds = await redis.smembers('athletes');
    const bannedIds = new Set(await redis.smembers('banned:athletes'));

    const users = await Promise.all(
      athleteIds.map(async (id) => {
        const user = await getUser(id);
        if (!user) return null;
        return {
          id,
          firstname: user.athlete?.firstname ?? '?',
          lastname: user.athlete?.lastname ?? '?',
          city: user.athlete?.city ?? null,
          profile_medium: user.athlete?.profile_medium ?? null,
          isBanned: bannedIds.has(id),
          isPremium: await isPremium(id),
        };
      })
    );

    return res.json({ users: users.filter(Boolean) });
  }

  if (req.method === 'DELETE') {
    const { athleteId } = req.body;
    if (!athleteId) return res.status(400).json({ error: 'athleteId requis' });
    if (String(athleteId) === String(session.athleteId)) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }

    // Remove athlete from all leagues
    const leagueIds = await redis.smembers(`athlete:${athleteId}:leagues`);
    for (const leagueId of leagueIds) {
      await redis.srem(`league:${leagueId}:members`, athleteId);
      const remaining = await redis.scard(`league:${leagueId}:members`);
      if (remaining === 0) {
        const league = await redis.get(`league:${leagueId}`);
        if (league) await redis.del(`code:${league.code}`);
        await redis.del(`league:${leagueId}`);
        await redis.del(`league:${leagueId}:members`);
      }
    }

    // Delete user data
    await redis.del(`athlete:${athleteId}:leagues`);
    await redis.del(`user:${athleteId}`);
    await redis.del(`premium:${athleteId}`);
    await redis.srem('athletes', athleteId);
    await redis.srem('banned:athletes', athleteId);

    return res.json({ ok: true });
  }

  res.status(405).end();
}
