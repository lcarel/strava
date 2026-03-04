import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code requis' });

  const normalizedCode = code.trim().toUpperCase();
  const leagueId = await redis.get(`code:${normalizedCode}`);
  if (!leagueId) return res.status(404).json({ error: 'Code invalide' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  // Already a member?
  const isMember = await redis.sismember(`league:${leagueId}:members`, session.athleteId);
  if (isMember) return res.status(409).json({ error: 'Déjà membre de cette ligue' });

  await redis.sadd(`league:${leagueId}:members`, session.athleteId);
  await redis.sadd(`athlete:${session.athleteId}:leagues`, leagueId);

  const memberCount = await redis.scard(`league:${leagueId}:members`);
  res.json({ league: { ...league, memberCount } });
}
