import { getSession } from '../../lib/session.js';

const ADMIN_IDS = (process.env.ADMIN_ATHLETE_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) {
    res.status(401).json({ error: 'Non authentifié' });
    return null;
  }
  if (!ADMIN_IDS.includes(String(session.athleteId))) {
    res.status(403).json({ error: 'Accès refusé' });
    return null;
  }
  return session;
}

export function isAdmin(athleteId) {
  return ADMIN_IDS.includes(String(athleteId));
}
