import redis from './redis.js';

const MAX_NOTIFS = 30;
const TTL        = 30 * 24 * 60 * 60; // 30 jours

export async function createNotification(athleteId, { type, title, body, leagueId, leagueName }) {
  const key  = `notif:${athleteId}`;
  const list = (await redis.get(key)) || [];
  const entry = {
    id:         `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type, title, body, leagueId, leagueName,
    read:      false,
    createdAt: new Date().toISOString(),
  };
  const updated = [entry, ...list].slice(0, MAX_NOTIFS);
  await redis.set(key, updated, { ex: TTL });
  return entry;
}

export async function getNotifications(athleteId) {
  return (await redis.get(`notif:${athleteId}`)) || [];
}

export async function markAllRead(athleteId) {
  const key  = `notif:${athleteId}`;
  const list = (await redis.get(key)) || [];
  if (!list.length) return;
  await redis.set(key, list.map(n => ({ ...n, read: true })), { ex: TTL });
}
