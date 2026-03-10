import { requireAdmin } from './middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    await redis.del('feedbacks');
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).end();

  const session = await requireAdmin(req, res);
  if (!session) return;

  const raw = await redis.lrange('feedbacks', 0, -1);
  const feedbacks = raw
    .map(item => { try { return JSON.parse(item); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const avg = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  return res.status(200).json({ feedbacks, total: feedbacks.length, avgRating: avg });
}
