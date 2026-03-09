import redis from './redis.js';

/**
 * Check whether an athlete has an active premium subscription.
 * Redis key: premium:{athleteId} → JSON { active, grantedAt, expiresAt|null }
 */
export async function isPremium(athleteId) {
  if (!athleteId) return false;
  const data = await redis.get(`premium:${athleteId}`);
  if (!data) return false;
  if (!data.active) return false;
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) return false;
  return true;
}

/**
 * Grant or revoke premium for an athlete.
 * durationDays: null = no expiry (lifetime), number = expires after N days
 */
export async function setPremium(athleteId, active, durationDays = null) {
  if (!active) {
    await redis.del(`premium:${athleteId}`);
    return { active: false };
  }
  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 86400 * 1000).toISOString()
    : null;
  const record = { active: true, grantedAt: new Date().toISOString(), expiresAt };
  await redis.set(`premium:${athleteId}`, record);
  return record;
}
