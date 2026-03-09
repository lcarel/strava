import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';
import { randomBytes } from 'crypto';

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
