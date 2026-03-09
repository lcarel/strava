import { requireAdmin } from './middleware.js';
import { setPremium } from '../../lib/premium.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { athleteId, active, durationDays = null } = req.body;
  if (!athleteId) return res.status(400).json({ error: 'athleteId requis' });
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active (boolean) requis' });

  // Verify athlete exists
  const user = await redis.get(`user:${athleteId}`);
  if (!user) return res.status(404).json({ error: 'Athlète introuvable' });

  const record = await setPremium(athleteId, active, durationDays);
  res.json({ ok: true, athleteId, ...record });
}
