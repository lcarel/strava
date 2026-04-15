import redis from '../../lib/redis.js';
import { CHALLENGE_DURATION_MS } from '../../lib/challenges.js';
import { createNotification } from '../../lib/notifications.js';
import { sendPushToMany } from '../../lib/push.js';

const REMINDER_MS    = 48 * 60 * 60 * 1000; // seuil : 48h restantes
const WINDOW_MS      =  1 * 60 * 60 * 1000; // ±1h (cron tourne toutes les heures)

export default async function handler(req, res) {
  // Vercel passe automatiquement CRON_SECRET en Bearer
  const auth = req.headers['authorization'];
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();

  // Collecter tous les IDs de ligues uniques
  const athleteIds  = await redis.smembers('athletes');
  const leagueIdSets = await Promise.all(
    athleteIds.map(id => redis.smembers(`athlete:${id}:leagues`))
  );
  const uniqueLeagueIds = [...new Set(leagueIdSets.flat())];

  let reminders = 0;

  for (const leagueId of uniqueLeagueIds) {
    const challenge = await redis.get(`league:${leagueId}:challenge`);
    if (!challenge?.startedAt) continue;

    const expiresAt     = new Date(challenge.startedAt).getTime() + CHALLENGE_DURATION_MS;
    const timeRemaining = expiresAt - now;

    // Pas dans la fenêtre 47h–49h → ignorer
    if (timeRemaining < REMINDER_MS - WINDOW_MS || timeRemaining > REMINDER_MS + WINDOW_MS) continue;

    // Déjà envoyé pour ce défi ?
    const flagKey = `reminder:48h:${leagueId}:${challenge.startedAt}`;
    if (await redis.get(flagKey)) continue;

    // Marquer envoyé (TTL 4 jours)
    await redis.set(flagKey, 1, { ex: 4 * 24 * 60 * 60 });

    const [league, memberIds] = await Promise.all([
      redis.get(`league:${leagueId}`),
      redis.smembers(`league:${leagueId}:members`),
    ]);
    if (!league || !memberIds.length) continue;

    const hoursLeft = Math.round(timeRemaining / (60 * 60 * 1000));
    const notifPayload = {
      type:       'challenge_reminder',
      title:      `⏰ Plus que ${hoursLeft}h pour relever le défi !`,
      body:       `${challenge.emoji} ${challenge.label} dans "${league.name}" — dépêche-toi !`,
      leagueId,
      leagueName: league.name,
    };

    await Promise.allSettled(memberIds.map(id => createNotification(id, notifPayload)));
    sendPushToMany(memberIds, { ...notifPayload, icon: '/icons/apple-touch-icon.png' });
    reminders++;
  }

  res.json({ ok: true, reminders, checked: uniqueLeagueIds.length });
}
