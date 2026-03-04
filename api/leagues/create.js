import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' });

  const id = randomBytes(6).toString('hex');
  const code = randomBytes(3).toString('hex').toUpperCase(); // ex: "A3F8C2"

  const league = {
    id,
    name: name.trim(),
    code,
    createdBy: session.athleteId,
    createdAt: new Date().toISOString(),
  };

  await redis.set(`league:${id}`, league);
  await redis.set(`code:${code}`, id);
  await redis.sadd(`league:${id}:members`, session.athleteId);
  await redis.sadd(`athlete:${session.athleteId}:leagues`, id);

  res.json({ league });
}
