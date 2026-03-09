import { getSession } from '../../lib/session.js';
import { isPremium } from '../../lib/premium.js';
import redis from '../../lib/redis.js';
import { randomBytes } from 'crypto';

const FREE_MAX_CREATED_LEAGUES = 1;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });
  const trimmedName = name.trim();
  if (trimmedName.length > 100) return res.status(400).json({ error: 'Nom trop long (100 caractères max)' });
  // Reject control characters
  if (/[\x00-\x1F\x7F]/.test(trimmedName)) return res.status(400).json({ error: 'Caractères non autorisés' });

  // Free tier: max 1 created league
  if (!(await isPremium(session.athleteId))) {
    const leagueIds = await redis.smembers(`athlete:${session.athleteId}:leagues`);
    const ownedLeagues = await Promise.all(
      leagueIds.map(async (lid) => {
        const l = await redis.get(`league:${lid}`);
        return l && String(l.createdBy) === String(session.athleteId) ? l : null;
      })
    );
    if (ownedLeagues.filter(Boolean).length >= FREE_MAX_CREATED_LEAGUES) {
      return res.status(403).json({
        error: `En version gratuite, tu ne peux créer qu'${FREE_MAX_CREATED_LEAGUES} ligue. Passe en Premium pour en créer davantage.`,
        premiumRequired: true,
      });
    }
  }

  // Rate limit: max 10 leagues created per athlete per hour
  const creationRlKey = `ratelimit:create:${session.athleteId}`;
  const creations = await redis.incr(creationRlKey);
  if (creations === 1) await redis.expire(creationRlKey, 3600);
  if (creations > 10) return res.status(429).json({ error: 'Limite de création atteinte, réessaie dans une heure.' });

  const id = randomBytes(6).toString('hex');
  const code = randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars, 32 bits of entropy

  const league = {
    id,
    name: trimmedName,
    code,
    createdBy: session.athleteId,
    createdAt: new Date().toISOString(),
  };

  const TTL = 365 * 24 * 60 * 60;
  await redis.set(`league:${id}`, league, { ex: TTL });
  await redis.set(`code:${code}`, id, { ex: TTL });
  await redis.sadd(`league:${id}:members`, session.athleteId);
  await redis.sadd(`athlete:${session.athleteId}:leagues`, id);

  res.json({ league });
}
