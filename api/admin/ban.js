import { requireAdmin } from './middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const { athleteId, action } = req.body; // action: 'ban' | 'unban'
  if (!athleteId) return res.status(400).json({ error: 'athleteId requis' });
  if (!['ban', 'unban'].includes(action)) return res.status(400).json({ error: 'action invalide' });
  if (String(athleteId) === String(session.athleteId)) {
    return res.status(400).json({ error: 'Impossible de se bannir soi-même' });
  }

  if (action === 'ban') {
    await redis.sadd('banned:athletes', String(athleteId));
  } else {
    await redis.srem('banned:athletes', String(athleteId));
  }

  res.json({ ok: true, athleteId, action });
}
