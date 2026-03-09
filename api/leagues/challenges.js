import { getSession } from '../../lib/session.js';
import { CHALLENGES, CHALLENGE_CATEGORIES } from '../../lib/challenges.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  res.json({ challenges: CHALLENGES, categories: CHALLENGE_CATEGORIES });
}
