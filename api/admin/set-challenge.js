import { requireAdmin } from './middleware.js';
import { CHALLENGES } from '../../lib/challenges.js';
import { createNotification } from '../../lib/notifications.js';
import { sendPushToMany } from '../../lib/push.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await requireAdmin(req, res);
  if (!session) return;

  const { leagueId, challengeId } = req.body;
  if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  async function archiveExisting() {
    const existing = await redis.get(`league:${leagueId}:challenge`);
    if (!existing) return;
    const histKey = `league:${leagueId}:challenge:history`;
    const history = (await redis.get(histKey)) || [];
    const updated = [{ ...existing, archivedAt: new Date().toISOString() }, ...history].slice(0, 20);
    await redis.set(histKey, updated, { ex: 365 * 24 * 60 * 60 });
  }

  // Clear challenge
  if (!challengeId) {
    await archiveExisting();
    await redis.del(`league:${leagueId}:challenge`);
    return res.json({ ok: true, challenge: null });
  }

  const def = CHALLENGES.find(c => c.id === challengeId);
  if (!def) return res.status(400).json({ error: 'Défi invalide' });

  await archiveExisting();
  const challenge = { ...def, startedAt: new Date().toISOString() };
  await redis.set(`league:${leagueId}:challenge`, challenge);

  // Notify all members (admin-triggered, no exclusion)
  const memberIds = await redis.smembers(`league:${leagueId}:members`);
  if (memberIds.length) {
    const notifPayload = {
      type:       'challenge',
      title:      `🎯 Nouveau défi dans "${league.name}"`,
      body:       `${def.emoji} ${def.label} — ${def.desc}`,
      leagueId,
      leagueName: league.name,
    };
    Promise.allSettled(memberIds.map(id => createNotification(id, notifPayload))).catch(() => {});
    sendPushToMany(memberIds, { ...notifPayload, icon: '/icons/apple-touch-icon.png' });
  }

  res.json({ ok: true, challenge });
}
