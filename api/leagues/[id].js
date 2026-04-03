import { getSession } from '../../lib/session.js';
import { fetchMonthStats, fetchHistoricalMonthStats, getUser, getMonthStart, getWeekStart } from '../../lib/strava.js';
import { computeProgress, CHALLENGE_DURATION_MS } from '../../lib/challenges.js';
import { computePoints, BOOST_POINTS, BOOSTS_PER_MONTH } from '../../lib/points.js';
import { isPremium } from '../../lib/premium.js';
import { checkRankingBadges } from '../../lib/badges.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const requestedMetric = req.query.metric || 'distance';
  const { id } = req.query;
  // month=0 → mois en cours, 1 → mois dernier, 2-3 → premium
  const requestedMonth = Math.max(0, Math.min(3, parseInt(req.query.month ?? '0', 10) || 0));

  const userIsPremium = await isPremium(session.athleteId);
  let metric = requestedMetric;
  let month  = requestedMonth;
  let premiumRequired = false;

  if (metric === 'elevation' && !userIsPremium) {
    metric = 'distance';
    premiumRequired = true;
  }
  // Free: mois en cours + mois dernier. Mois 2-3 nécessitent Premium.
  if (month > 1 && !userIsPremium) {
    month = 0;
    premiumRequired = true;
  }

  const league = await redis.get(`league:${id}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  const isMember = await redis.sismember(`league:${id}:members`, session.athleteId);
  if (!isMember) return res.status(403).json({ error: 'Accès refusé' });

  const [memberIds, rawChallenge] = await Promise.all([
    redis.smembers(`league:${id}:members`),
    redis.get(`league:${id}:challenge`),
  ]);
  const memberCount = memberIds.length;

  // ── Auto-archive challenge from a previous month ───────────────────────────
  let challenge = rawChallenge;
  if (challenge?.startedAt) {
    const currentMonthStart = getMonthStart(0);
    const challengeStarted  = new Date(challenge.startedAt);
    if (challengeStarted < currentMonthStart) {
      const histKey = `league:${id}:challenge:history`;
      const history = (await redis.get(histKey)) || [];
      const updated  = [{ ...challenge, archivedAt: new Date().toISOString() }, ...history].slice(0, 20);
      await Promise.all([
        redis.set(histKey, updated, { ex: 365 * 24 * 60 * 60 }),
        redis.del(`league:${id}:challenge`),
      ]);
      challenge = null;
    }
  }

  const challengeHistory = (await redis.get(`league:${id}:challenge:history`)) || [];

  // ── Boosts (mois en cours uniquement) ─────────────────────────────────────
  let boostsReceivedMap = {};
  let myBoostsGiven     = [];
  if (month === 0) {
    const monthKey    = getMonthStart(0).toISOString().slice(0, 7); // YYYY-MM
    const boostValues = await Promise.all(
      memberIds.map(mid => redis.get(`boost:${id}:month:${monthKey}:${mid}`))
    );
    memberIds.forEach((mid, idx) => {
      const targets = boostValues[idx] || [];
      targets.forEach(targetId => {
        boostsReceivedMap[targetId] = (boostsReceivedMap[targetId] || 0) + 1;
      });
      if (String(mid) === String(session.athleteId)) myBoostsGiven = targets;
    });
  }

  const results = await Promise.all(
    memberIds.map(async (athleteId) => {
      try {
        const user = await getUser(athleteId);
        if (!user) return null;
        const stats = month === 0
          ? await fetchMonthStats(athleteId)
          : await fetchHistoricalMonthStats(athleteId, month);
        // Défis : applicables seulement au mois en cours
        const progress = (challenge && month === 0) ? computeProgress(stats, challenge) : null;
        const boostsReceived = boostsReceivedMap[athleteId] || 0;
        const boostPoints    = boostsReceived * BOOST_POINTS;
        const totals = {
          ...stats.totals,
          points: computePoints(stats.totals, progress?.completed ?? false) + boostPoints,
          boostsReceived,
          boostPoints,
        };
        const entry = {
          athlete: {
            id: athleteId,
            firstname: user.athlete.firstname,
            lastname: user.athlete.lastname,
            profile_medium: user.athlete.profile_medium,
            city: user.athlete.city,
          },
          totals,
          by_sport: stats.by_sport,
        };
        if (progress) entry.progress = progress;
        return entry;
      } catch { return null; }
    })
  );

  const leaderboard = results
    .filter(Boolean)
    .sort((a, b) => {
      if (metric === 'time')      return b.totals.moving_time - a.totals.moving_time;
      if (metric === 'elevation') return b.totals.elevation   - a.totals.elevation;
      if (metric === 'points')    return b.totals.points      - a.totals.points;
      return b.totals.distance - a.totals.distance;
    });

  // Badges de classement — basés sur le mois en cours et le mois dernier
  if (month <= 1) {
    const byDistance = [...leaderboard].sort((a, b) => b.totals.distance - a.totals.distance);
    checkRankingBadges(byDistance, id, getMonthStart(month).toISOString().slice(0, 7)).catch(console.error);
  }

  // Enrichir le défi avec les infos d'expiry
  let challengeOut = null;
  if (month === 0 && challenge) {
    const expiresAt = challenge.startedAt
      ? new Date(challenge.startedAt).getTime() + CHALLENGE_DURATION_MS
      : null;
    challengeOut = {
      ...challenge,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      expired:   expiresAt ? Date.now() > expiresAt : false,
    };
  }

  res.json({
    league: { ...league, memberCount },
    leaderboard,
    challenge: challengeOut,
    challengeHistory,
    week_start: getMonthStart(month).toISOString(),
    ...(premiumRequired ? { premiumRequired: true } : {}),
    ...(month === 0 ? { boosts: { myBoostsGiven, myBoostsRemaining: BOOSTS_PER_MONTH - myBoostsGiven.length } } : {}),
  });
}
