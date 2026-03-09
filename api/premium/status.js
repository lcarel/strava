import { getSession } from '../../lib/session.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const data = await redis.get(`premium:${session.athleteId}`);
  if (!data || !data.active) return res.json({ isPremium: false });

  // Check expiry
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return res.json({ isPremium: false });
  }

  res.json({ isPremium: true, expiresAt: data.expiresAt ?? null, grantedAt: data.grantedAt });
}
