import { getSession } from '../../lib/session.js';
import { isAdmin } from '../admin/middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId, name } = req.body;
  if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

  const trimmedName = name?.trim();
  if (!trimmedName) return res.status(400).json({ error: 'Nom requis' });
  if (trimmedName.length > 100) return res.status(400).json({ error: 'Nom trop long (100 caractères max)' });
  if (/[\x00-\x1F\x7F]/.test(trimmedName)) return res.status(400).json({ error: 'Caractères non autorisés' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  const isCreator = String(league.createdBy) === String(session.athleteId);
  if (!isCreator && !isAdmin(session.athleteId)) return res.status(403).json({ error: 'Accès refusé' });

  const updated = { ...league, name: trimmedName };
  const ttl = await redis.ttl(`league:${leagueId}`);
  await redis.set(`league:${leagueId}`, updated, { ex: ttl > 0 ? ttl : 365 * 24 * 60 * 60 });

  res.json({ ok: true, league: updated });
}
