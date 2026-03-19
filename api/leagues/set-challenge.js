import { getSession } from '../../lib/session.js';
import { CHALLENGES } from '../../lib/challenges.js';
import { isPremium } from '../../lib/premium.js';
import { createNotification } from '../../lib/notifications.js';
import { sendPushToMany } from '../../lib/push.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { leagueId, challengeId } = req.body;
  if (!leagueId) return res.status(400).json({ error: 'leagueId requis' });

  const league = await redis.get(`league:${leagueId}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  if (String(league.createdBy) !== String(session.athleteId)) {
    return res.status(403).json({ error: 'Seul le créateur de la ligue peut gérer les défis' });
  }

  // Archive existing challenge before replacing / clearing
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

  if (def.premium && !(await isPremium(session.athleteId))) {
    return res.status(403).json({ error: 'Ce défi est réservé aux membres Premium.', premiumRequired: true });
  }

  await archiveExisting();
  const challenge = { ...def, startedAt: new Date().toISOString() };
  await redis.set(`league:${leagueId}:challenge`, challenge);

  // ── Notifier tous les membres (sauf le créateur) ───────────────────────────
  const memberIds = await redis.smembers(`league:${leagueId}:members`);
  const targets   = memberIds.filter(id => String(id) !== String(session.athleteId));
  if (targets.length) {
    const notifPayload = {
      type:       'challenge',
      title:      `🎯 Nouveau défi dans "${league.name}"`,
      body:       `${def.emoji} ${def.label} — ${def.desc}`,
      leagueId,
      leagueName: league.name,
    };
    // Notifs in-app + push en parallèle, non-bloquant
    Promise.allSettled(targets.map(id => createNotification(id, notifPayload))).catch(() => {});
    sendPushToMany(targets, { ...notifPayload, icon: '/icons/apple-touch-icon.png' });
  }

  res.json({ ok: true, challenge });
}
