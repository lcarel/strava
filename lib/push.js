import webpush from 'web-push';
import redis from './redis.js';

// Lazy init — évite l'erreur si les vars ne sont pas encore chargées au module-load
function init() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@strava-stats.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

export async function saveSubscription(athleteId, subscription) {
  await redis.set(`push:sub:${athleteId}`, subscription, { ex: 365 * 24 * 60 * 60 });
}

export async function sendPush(athleteId, payload) {
  if (!init()) return;
  const sub = await redis.get(`push:sub:${athleteId}`);
  if (!sub) return;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    // Subscription expirée ou invalide → on la supprime
    if (err.statusCode === 410 || err.statusCode === 404) {
      await redis.del(`push:sub:${athleteId}`);
    }
  }
}

// Envoie à plusieurs athletes en parallèle (non-bloquant)
export function sendPushToMany(athleteIds, payload) {
  Promise.allSettled(athleteIds.map(id => sendPush(id, payload))).catch(() => {});
}
