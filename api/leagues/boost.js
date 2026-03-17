import { getSession } from '../../lib/session.js';
import { getWeekStart } from '../../lib/strava.js';
import { BOOST_POINTS, BOOSTS_PER_WEEK } from '../../lib/points.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId, targetId } = req.body;
  if (!leagueId || !targetId) return res.status(400).json({ error: 'leagueId et targetId requis' });

  if (String(targetId) === String(session.athleteId)) {
    return res.status(400).json({ error: 'Tu ne peux pas te booster toi-même' });
  }

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  const [isMember, isTargetMember] = await Promise.all([
    redis.sismember(`league:${leagueId}:members`, session.athleteId),
    redis.sismember(`league:${leagueId}:members`, String(targetId)),
  ]);
  if (!isMember) return res.status(403).json({ error: 'Accès refusé' });
  if (!isTargetMember) return res.status(404).json({ error: 'Membre introuvable dans cette ligue' });

  const weekStart = getWeekStart().toISOString().slice(0, 10);
  const boostKey  = `boost:${leagueId}:${weekStart}:${session.athleteId}`;
  const given     = (await redis.get(boostKey)) || [];

  if (given.length >= BOOSTS_PER_WEEK) {
    return res.status(400).json({ error: `Tu as déjà utilisé tes ${BOOSTS_PER_WEEK} boosts cette semaine` });
  }
  if (given.includes(String(targetId))) {
    return res.status(400).json({ error: 'Tu as déjà boosté ce membre cette semaine' });
  }

  const updated = [...given, String(targetId)];
  await redis.set(boostKey, updated, { ex: 8 * 24 * 60 * 60 }); // TTL 8 jours

  return res.json({ ok: true, boostPoints: BOOST_POINTS, remaining: BOOSTS_PER_WEEK - updated.length });
}
