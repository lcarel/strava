import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  // Rate limit per IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
  const ipRlKey = `ratelimit:join:ip:${ip}`;
  const ipAttempts = await redis.incr(ipRlKey);
  if (ipAttempts === 1) await redis.expire(ipRlKey, 60);
  if (ipAttempts > 10) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans une minute.' });

  // Rate limit per authenticated athlete (harder to bypass)
  const athleteRlKey = `ratelimit:join:athlete:${session.athleteId}`;
  const athleteAttempts = await redis.incr(athleteRlKey);
  if (athleteAttempts === 1) await redis.expire(athleteRlKey, 3600);
  if (athleteAttempts > 20) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans une heure.' });

  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code requis' });

  const normalizedCode = code.trim().toUpperCase();
  const leagueId = await redis.get(`code:${normalizedCode}`);
  const league = leagueId ? await redis.get(`league:${leagueId}`) : null;
  // Unified error to avoid leaking whether a code maps to a league
  if (!leagueId || !league) return res.status(404).json({ error: 'Code invalide' });

  // Already a member?
  const isMember = await redis.sismember(`league:${leagueId}:members`, session.athleteId);
  if (isMember) return res.status(409).json({ error: 'Déjà membre de cette ligue' });

  await redis.sadd(`league:${leagueId}:members`, session.athleteId);
  await redis.sadd(`athlete:${session.athleteId}:leagues`, leagueId);

  const memberCount = await redis.scard(`league:${leagueId}:members`);
  res.json({ league: { ...league, memberCount } });
}
