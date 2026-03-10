import { getSession } from '../lib/session.js';
import { getAthleteBadges, BADGE_DEFS } from '../lib/badges.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Non connecté' });

  const badges = await getAthleteBadges(session.athleteId);

  // Group by badge id, keep most recent earnedAt, count occurrences
  const grouped = {};
  for (const b of badges) {
    if (!grouped[b.id]) {
      const def = BADGE_DEFS.find(d => d.id === b.id);
      grouped[b.id] = { ...b, count: 0, desc: def?.desc ?? '' };
    }
    grouped[b.id].count++;
  }

  const result = Object.values(grouped).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

  return res.status(200).json({ badges: result, total: badges.length });
}
