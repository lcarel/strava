import { getSession } from '../lib/session.js';
import { getUser } from '../lib/strava.js';
import { isAdmin } from './admin/middleware.js';
import { isPremium } from '../lib/premium.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.json({ connected: false });

  const user = await getUser(session.athleteId);
  if (!user) return res.json({ connected: false });

  const premium = await isPremium(session.athleteId);
  res.json({ connected: true, athlete: user.athlete, isAdmin: isAdmin(session.athleteId), isPremium: premium });
}
