import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId } = req.body;
  if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

  await redis.srem(`league:${leagueId}:members`, session.athleteId);
  await redis.srem(`athlete:${session.athleteId}:leagues`, leagueId);

  // If league is empty, clean up
  const remaining = await redis.scard(`league:${leagueId}:members`);
  if (remaining === 0) {
    const league = await redis.get(`league:${leagueId}`);
    if (league) await redis.del(`code:${league.code}`);
    await redis.del(`league:${leagueId}`);
    await redis.del(`league:${leagueId}:members`);
  }

  res.json({ ok: true });
}
