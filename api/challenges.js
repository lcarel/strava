import { CHALLENGES, CHALLENGE_CATEGORIES } from '../lib/challenges.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.json({ challenges: CHALLENGES, categories: CHALLENGE_CATEGORIES });
}
