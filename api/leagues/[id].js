import { getSession } from '../../lib/session.js';
import { fetchWeekStats, fetchHistoricalWeekStats, getUser, getWeekStart } from '../../lib/strava.js';
import { computeProgress, CHALLENGE_DURATION_MS } from '../../lib/challenges.js';
import { computePoints } from '../../lib/points.js';
import { isPremium } from '../../lib/premium.js';
import { checkRankingBadges } from '../../lib/badges.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const requestedMetric = req.query.metric || 'distance';
  const { id } = req.query;
  const requestedWeek = Math.max(0, Math.min(4, parseInt(req.query.week ?? '0', 10) || 0));

  // Gate elevation sort + historical weeks behind premium
  const userIsPremium = await isPremium(session.athleteId);
  let metric = requestedMetric;
  let week = requestedWeek;
  let premiumRequired = false;
  if (metric === 'elevation' && !userIsPremium) {
    metric = 'distance';
    premiumRequired = true;
  }
  // Free: current week + last week (week 1). Weeks 2-4 require premium.
  if (week > 1 && !userIsPremium) {
    week = 0;
    premiumRequired = true;
  }

  const league = await redis.get(`league:${id}`);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  // Must be a member
  const isMember = await redis.sismember(`league:${id}:members`, session.athleteId);
  if (!isMember) return res.status(403).json({ error: 'Accès refusé' });

  const [memberIds, challenge] = await Promise.all([
    redis.smembers(`league:${id}:members`),
    redis.get(`league:${id}:challenge`),
  ]);
  const memberCount = memberIds.length;

  const results = await Promise.all(
    memberIds.map(async (athleteId) => {
      try {
        const user = await getUser(athleteId);
        if (!user) return null;
        const stats = week === 0
          ? await fetchWeekStats(athleteId)
          : await fetchHistoricalWeekStats(athleteId, week);
        // Challenges only apply to the current week
        const progress = (challenge && week === 0) ? computeProgress(stats, challenge) : null;
        const totals = { ...stats.totals, points: computePoints(stats.totals, progress?.completed ?? false) };
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

  // Award ranking badges for current week and last week — sort by distance for fairness
  if (week <= 1) {
    const byDistance = [...leaderboard].sort((a, b) => b.totals.distance - a.totals.distance);
    checkRankingBadges(byDistance, id, getWeekStart(week).toISOString().slice(0, 10)).catch(console.error);
  }

  // Enrich challenge with expiry info before sending to client
  let challengeOut = null;
  if (week === 0 && challenge) {
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
    week_start: getWeekStart(week).toISOString(),
    ...(premiumRequired ? { premiumRequired: true } : {}),
  });
}
