import { requireAdmin } from './middleware.js';
import { fetchHistoricalWeekStats, getUser, getWeekStart } from '../../lib/strava.js';
import { checkPerformanceBadges, checkRankingBadges } from '../../lib/badges.js';
import redis from '../../lib/redis.js';

// Nombre de semaines à traiter (max 4)
const WEEKS_BACK = 4;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const athleteIds = await redis.smembers('athletes');
  const results = { weeks: WEEKS_BACK, athletes: 0, leagues: 0, errors: 0 };

  // ── 1. Badges de performance (par athlète × semaine) ──────────────────────
  for (const athleteId of athleteIds) {
    for (let w = 1; w <= WEEKS_BACK; w++) {
      try {
        const weekStart = getWeekStart(w).toISOString().slice(0, 10);
        const stats = await fetchHistoricalWeekStats(athleteId, w);
        await checkPerformanceBadges(athleteId, stats, weekStart);
      } catch {
        results.errors++;
      }
    }
    results.athletes++;
  }

  // ── 2. Badges de classement (par ligue × semaine) ─────────────────────────
  const leagueIdSets = await Promise.all(
    athleteIds.map(id => redis.smembers(`athlete:${id}:leagues`))
  );
  const uniqueLeagueIds = [...new Set(leagueIdSets.flat())];

  for (const leagueId of uniqueLeagueIds) {
    const memberIds = await redis.smembers(`league:${leagueId}:members`);
    if (memberIds.length === 0) continue;

    for (let w = 1; w <= WEEKS_BACK; w++) {
      try {
        const weekStart = getWeekStart(w).toISOString().slice(0, 10);
        const entries = await Promise.all(
          memberIds.map(async (athleteId) => {
            try {
              const user = await getUser(athleteId);
              if (!user) return null;
              const stats = await fetchHistoricalWeekStats(athleteId, w);
              return { athlete: { id: athleteId }, totals: stats.totals };
            } catch { return null; }
          })
        );
        const leaderboard = entries
          .filter(Boolean)
          .sort((a, b) => b.totals.distance - a.totals.distance);
        await checkRankingBadges(leaderboard, leagueId, weekStart);
      } catch {
        results.errors++;
      }
    }
    results.leagues++;
  }

  res.json({ ok: true, ...results });
}
