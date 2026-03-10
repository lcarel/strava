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

  // Group earned badges by id
  const earned = {};
  for (const b of rawBadges) {
    if (!earned[b.id]) earned[b.id] = { earnedAt: b.earnedAt, count: 0 };
    earned[b.id].count++;
  }

  // Return ALL badge definitions, marking earned ones
  const badges = BADGE_DEFS.map(def => ({
    id: def.id,
    emoji: def.emoji,
    label: def.label,
    desc: def.desc,
    earned: !!earned[def.id],
    count: earned[def.id]?.count ?? 0,
    earnedAt: earned[def.id]?.earnedAt ?? null,
  }));

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
