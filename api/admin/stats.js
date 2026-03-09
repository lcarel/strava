import { requireAdmin } from './middleware.js';
import redis from '../../lib/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const athleteIds = await redis.smembers('athletes');
  const bannedIds = await redis.smembers('banned:athletes');

  // Count unique leagues across all athletes
  const leagueIdSets = await Promise.all(
    athleteIds.map(id => redis.smembers(`athlete:${id}:leagues`))
  );
  const uniqueLeagueIds = new Set(leagueIdSets.flat());

  // Count athletes active this week (have a stats cache entry)
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStartDate().toISOString().slice(0, 10);
  const activeChecks = await Promise.all(
    athleteIds.map(async id => {
      const cached = await redis.get(`v2:stats:${id}:${weekStart}`);
      return cached !== null;
    })
  );
  const activeThisWeek = activeChecks.filter(Boolean).length;

  res.json({
    totalUsers: athleteIds.length,
    bannedUsers: bannedIds.length,
    activeThisWeek,
    totalLeagues: uniqueLeagueIds.size,
  });
}

function getWeekStartDate() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
