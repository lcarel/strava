import { getSession } from '../lib/session.js';
import redis from '../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Non connecté' });

  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Note invalide' });

  const feedback = {
    athleteId: session.athleteId,
    rating: Number(rating),
    comment: String(comment || '').slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  await redis.lpush('feedbacks', JSON.stringify(feedback));

  return res.status(200).json({ ok: true });
}
