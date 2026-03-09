import { getSession } from '../../lib/session.js';
import { isAdmin } from '../admin/middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId, memberId } = req.body;
  if (!leagueId || !memberId) return res.status(400).json({ error: 'leagueId et memberId requis' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  const isCreator = String(league.createdBy) === String(session.athleteId);
  const admin = isAdmin(session.athleteId);

  if (!isCreator && !admin) return res.status(403).json({ error: 'Accès refusé' });

  // Prevent kicking yourself
  if (String(memberId) === String(session.athleteId)) return res.status(400).json({ error: 'Impossible de s\'exclure soi-même' });

  // Only admin can kick the creator
  if (String(memberId) === String(league.createdBy) && !admin) {
    return res.status(403).json({ error: 'Seul un admin peut exclure le créateur de la ligue' });
  }

  const isMember = await redis.sismember(`league:${leagueId}:members`, String(memberId));
  if (!isMember) return res.status(404).json({ error: 'Membre introuvable dans cette ligue' });

  await redis.srem(`league:${leagueId}:members`, String(memberId));
  await redis.srem(`athlete:${memberId}:leagues`, leagueId);

  res.json({ ok: true });
}
