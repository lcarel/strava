import { getSession } from '../../lib/session.js';
import { getUser } from '../../lib/strava.js';
import { getAthleteBadges, BADGE_DEFS } from '../../lib/badges.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Must be authenticated to view profiles
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Non connecté' });

  const { id } = req.query;
  if (!id || !/^\d+$/.test(String(id))) return res.status(400).json({ error: 'ID invalide' });

  const user = await getUser(String(id));
  if (!user) return res.status(404).json({ error: 'Athlète introuvable' });

  const rawBadges = await getAthleteBadges(String(id));

  // Group by badge id, count occurrences, enrich with desc
  const grouped = {};
  for (const b of rawBadges) {
    if (!grouped[b.id]) {
      const def = BADGE_DEFS.find(d => d.id === b.id);
      grouped[b.id] = { ...b, count: 0, desc: def?.desc ?? '' };
    }
    grouped[b.id].count++;
  }

  const badges = Object.values(grouped).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));

  return res.status(200).json({
    athlete: {
      id: String(id),
      firstname: user.athlete.firstname,
      lastname: user.athlete.lastname,
      profile_medium: user.athlete.profile_medium ?? null,
      city: user.athlete.city ?? null,
    },
    badges,
  });
}
