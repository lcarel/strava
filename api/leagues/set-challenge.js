import { getSession } from '../../lib/session.js';
import { CHALLENGES } from '../../lib/challenges.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId, challengeId } = req.body;
  if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  if (String(league.createdBy) !== String(session.athleteId)) {
    return res.status(403).json({ error: 'Seul le créateur de la ligue peut gérer les défis' });
  }

  // Clear challenge
  if (!challengeId) {
    await redis.del(`league:${leagueId}:challenge`);
    return res.json({ ok: true, challenge: null });
  }

  const def = CHALLENGES.find(c => c.id === challengeId);
  if (!def) return res.status(400).json({ error: 'Défi invalide' });

  const challenge = { ...def, startedAt: new Date().toISOString() };
  await redis.set(`league:${leagueId}:challenge`, challenge);

  res.json({ ok: true, challenge });
}
