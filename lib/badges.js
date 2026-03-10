import redis from './redis.js';
import { getWeekStart } from './strava.js';

// ── Badge definitions ──────────────────────────────────────────────────────────
export const BADGE_DEFS = [
  // Classement ligue
  { id: 'rank_1',     emoji: '🥇', label: 'Vainqueur',        desc: '1er du classement d\'une ligue sur une semaine' },
  { id: 'rank_2',     emoji: '🥈', label: 'Vice-champion',    desc: '2e du classement d\'une ligue sur une semaine' },
  { id: 'rank_3',     emoji: '🥉', label: 'Sur le podium',    desc: '3e du classement d\'une ligue sur une semaine' },
  // Dénivelé
  { id: 'eagle',      emoji: '🦅', label: 'Aigle des cimes',  desc: '+2000 m de D+ en une seule semaine' },
  { id: 'kilian',     emoji: '🏔️', label: 'Kilian Jornet',   desc: '+1000 m de D+ en une seule semaine' },
  // Distance
  { id: 'centurion',  emoji: '💯', label: 'Centurion',        desc: '+100 km courus en une seule semaine' },
  { id: 'beast',      emoji: '🔥', label: 'Bête de course',   desc: '+50 km courus en une seule semaine' },
  { id: 'marathon',   emoji: '🏃', label: 'Marathonien',      desc: '+42,195 km en une seule sortie' },
  // Régularité
  { id: 'streak',     emoji: '📅', label: 'Régulier',         desc: 'Actif les 4 dernières semaines d\'affilée' },
  { id: 'diamond',    emoji: '💎', label: 'Diamant',          desc: 'Activité chaque jour de la semaine (7j/7)' },
  // Horaires
  { id: 'early_bird', emoji: '🌅', label: 'Lève-tôt',        desc: 'Sortie démarrée avant 6h du matin' },
  { id: 'nocturnal',  emoji: '🌙', label: 'Noctambule',       desc: 'Sortie démarrée après 21h' },
];

export function getBadgeDef(id) {
  return BADGE_DEFS.find(b => b.id === id) ?? null;
}

// ── Core: award once per (athlete × badge × contextKey) ───────────────────────
// contextKey examples:
//   performance → week start ISO date "2026-03-10"
//   ranking     → "{leagueId}:{weekStart}"
export async function awardBadge(athleteId, badgeId, contextKey) {
  const dedupKey = `badge_awarded:${athleteId}:${badgeId}:${contextKey}`;
  const isNew = await redis.set(dedupKey, '1', { nx: true });
  if (isNew === null) return; // Already awarded this week / this context

  const def = getBadgeDef(badgeId);
  if (!def) return;

  const entry = JSON.stringify({
    id: badgeId,
    emoji: def.emoji,
    label: def.label,
    earnedAt: new Date().toISOString(),
    context: contextKey,
  });

  // Store in athlete's badge list, cap at 300 entries
  const listKey = `badges:${athleteId}`;
  await redis.lpush(listKey, entry);
  await redis.ltrim(listKey, 0, 299);
}

// ── Fetch all badges for an athlete ───────────────────────────────────────────
export async function getAthleteBadges(athleteId) {
  const raw = await redis.lrange(`badges:${athleteId}`, 0, -1);
  return raw
    .map(item => { try { return JSON.parse(item); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
}

// ── Performance badge checks ───────────────────────────────────────────────────
// Called with the athlete's own current-week stats (includes activities list).
export async function checkPerformanceBadges(athleteId, weekData) {
  try {
    const { totals, activities = [] } = weekData;
    const weekStart = getWeekStart().toISOString().slice(0, 10);

    const checks = [];

    // ── Elevation ─────────────────────────────────────────────────────────────
    if (totals.elevation >= 2000) checks.push(awardBadge(athleteId, 'eagle', weekStart));
    if (totals.elevation >= 1000) checks.push(awardBadge(athleteId, 'kilian', weekStart));

    // ── Distance (week total) ──────────────────────────────────────────────────
    if (totals.distance >= 100_000) checks.push(awardBadge(athleteId, 'centurion', weekStart));
    if (totals.distance >= 50_000)  checks.push(awardBadge(athleteId, 'beast', weekStart));

    // ── Marathon in a single activity ─────────────────────────────────────────
    if (activities.some(act => (act.distance ?? 0) >= 42_195)) {
      checks.push(awardBadge(athleteId, 'marathon', weekStart));
    }

    // ── Early bird — start before 06:00 local time ────────────────────────────
    if (activities.some(act => {
      const hour = parseInt(act.start_date_local?.slice(11, 13) ?? '12', 10);
      return hour < 6;
    })) {
      checks.push(awardBadge(athleteId, 'early_bird', weekStart));
    }

    // ── Nocturnal — start at or after 21:00 local time ───────────────────────
    if (activities.some(act => {
      const hour = parseInt(act.start_date_local?.slice(11, 13) ?? '0', 10);
      return hour >= 21;
    })) {
      checks.push(awardBadge(athleteId, 'nocturnal', weekStart));
    }

    // ── Diamond — activity on all 7 days of the week ──────────────────────────
    if (activities.length >= 7) {
      const days = new Set(activities.map(a => a.start_date_local?.slice(0, 10)).filter(Boolean));
      if (days.size >= 7) checks.push(awardBadge(athleteId, 'diamond', weekStart));
    }

    // ── Streak — mark this week active, then check last 3 weeks ──────────────
    // Store a lightweight "active week" marker (35-day TTL covers 5 weeks safely)
    await redis.set(`active_week:${athleteId}:${weekStart}`, '1', { ex: 35 * 86_400 });

    if (totals.count > 0) {
      const prevKeys = [1, 2, 3].map(w =>
        `active_week:${athleteId}:${getWeekStart(w).toISOString().slice(0, 10)}`
      );
      const prevMarkers = await Promise.all(prevKeys.map(k => redis.get(k)));
      if (prevMarkers.every(Boolean)) {
        checks.push(awardBadge(athleteId, 'streak', weekStart));
      }
    }

    await Promise.all(checks);
  } catch (err) {
    console.error('[badges] checkPerformanceBadges error:', err);
  }
}

// ── Ranking badge checks ───────────────────────────────────────────────────────
// leaderboard must be sorted by distance (fixed metric for badge fairness).
export async function checkRankingBadges(leaderboard, leagueId, weekStart) {
  try {
    const rankBadges = ['rank_1', 'rank_2', 'rank_3'];
    const contextBase = `${leagueId}:${weekStart}`;
    await Promise.all(
      leaderboard.slice(0, 3).map((entry, i) => {
        if (!entry?.athlete?.id) return Promise.resolve();
        return awardBadge(entry.athlete.id, rankBadges[i], contextBase);
      })
    );
  } catch (err) {
    console.error('[badges] checkRankingBadges error:', err);
  }
}
