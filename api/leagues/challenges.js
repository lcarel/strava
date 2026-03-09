import { getSession } from '../../lib/session.js';
import { CHALLENGES, CHALLENGE_CATEGORIES } from '../../lib/challenges.js';
import { isPremium } from '../../lib/premium.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const premium = await isPremium(session.athleteId);
  res.json({ challenges: CHALLENGES, categories: CHALLENGE_CATEGORIES, isPremium: premium });
}
