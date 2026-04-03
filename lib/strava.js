import redis from './redis.js';

const CACHE_TTL_CURRENT  = 300;          // 5 min — semaine en cours
const CACHE_TTL_HISTORY  = 24 * 60 * 60; // 24 h  — semaines passées

// ── User storage ──────────────────────────────────────────────────────────────
export async function getUser(athleteId) {
  return redis.get(`user:${athleteId}`);
}

export async function saveUser(athleteId, data) {
  await redis.set(`user:${athleteId}`, data, { ex: 30 * 24 * 60 * 60 });
}

// ── Token management ──────────────────────────────────────────────────────────
export async function getValidToken(athleteId) {
  const user = await getUser(athleteId);
  if (!user) throw new Error('User not found');

  if (Date.now() / 1000 < user.expires_at - 60) return user.access_token;

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: user.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error('Token refresh failed — reconnect required');
  user.access_token = data.access_token;
  user.refresh_token = data.refresh_token;
  user.expires_at = data.expires_at;
  await saveUser(athleteId, user);
  return data.access_token;
}

// ── Week helpers (gardés pour les défis et badges) ────────────────────────────
export function getWeekStart(weeksBack = 0) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - weeksBack * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ── Month helpers ─────────────────────────────────────────────────────────────
export function getMonthStart(monthsBack = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Core fetch — shared by current and historical ─────────────────────────────
async function fetchActivitiesForPeriod(athleteId, after, before) {
  const token = await getValidToken(athleteId);
  let url = `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`;
  if (before) url += `&before=${before}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Strava API error');
  return res.json();
}

const RUNNING_TYPES = new Set(['Run', 'TrailRun']);

function processActivities(activities, weekStart, { includeList = false } = {}) {
  activities = activities.filter(act => RUNNING_TYPES.has(act.sport_type || act.type));
  const by_sport = {};
  for (const act of activities) {
    const type = act.sport_type || act.type;
    if (!by_sport[type]) by_sport[type] = { count: 0, distance: 0, moving_time: 0, elevation: 0 };
    by_sport[type].count     += 1;
    by_sport[type].distance  += act.distance            ?? 0;
    by_sport[type].moving_time += act.moving_time       ?? 0;
    by_sport[type].elevation += act.total_elevation_gain ?? 0;
  }

  const totals = activities.reduce(
    (acc, act) => ({
      count:       acc.count + 1,
      distance:    acc.distance    + (act.distance             ?? 0),
      moving_time: acc.moving_time + (act.moving_time          ?? 0),
      elevation:   acc.elevation   + (act.total_elevation_gain ?? 0),
    }),
    { count: 0, distance: 0, moving_time: 0, elevation: 0 }
  );

  const data = { totals, by_sport, week_start: weekStart.toISOString() };

  if (includeList) {
    data.activities = activities.map(({ name, sport_type, type, distance, moving_time, total_elevation_gain, start_date, start_date_local, average_temp }) => ({
      name, sport_type, type, distance, moving_time, total_elevation_gain, start_date, start_date_local,
      average_temp: average_temp ?? null,
    }));
  }

  return data;
}

// Cache key prefixes
const CACHE_KEY_PREFIX       = 'v2:stats';
const CACHE_KEY_PREFIX_MONTH = 'v2:stats:month';

// ── Current week ───────────────────────────────────────────────────────────────
export async function fetchWeekStats(athleteId) {
  const weekStart  = getWeekStart();
  const cacheKey   = `${CACHE_KEY_PREFIX}:${athleteId}:${weekStart.toISOString().slice(0, 10)}`;
  const cached     = await redis.get(cacheKey);
  if (cached) return cached;

  const after      = Math.floor(weekStart.getTime() / 1000);
  const activities = await fetchActivitiesForPeriod(athleteId, after, null);
  const data       = processActivities(activities, weekStart, { includeList: true });

  await redis.set(cacheKey, data, { ex: CACHE_TTL_CURRENT });
  return data;
}

// ── Current month ─────────────────────────────────────────────────────────────
export async function fetchMonthStats(athleteId) {
  const monthStart = getMonthStart();
  const cacheKey   = `${CACHE_KEY_PREFIX_MONTH}:${athleteId}:${monthStart.toISOString().slice(0, 7)}`;
  const cached     = await redis.get(cacheKey);
  if (cached) return cached;

  const after      = Math.floor(monthStart.getTime() / 1000);
  const activities = await fetchActivitiesForPeriod(athleteId, after, null);
  const data       = processActivities(activities, monthStart, { includeList: true });

  await redis.set(cacheKey, data, { ex: CACHE_TTL_CURRENT });
  return data;
}

// ── Historical month (monthsBack = 1 → mois dernier, 2 → il y a 2 mois…) ────
export async function fetchHistoricalMonthStats(athleteId, monthsBack) {
  const monthStart = getMonthStart(monthsBack);
  const monthEnd   = getMonthStart(monthsBack - 1); // début du mois suivant
  const cacheKey   = `${CACHE_KEY_PREFIX_MONTH}:${athleteId}:${monthStart.toISOString().slice(0, 7)}`;
  const cached     = await redis.get(cacheKey);
  if (cached) return cached;

  const after      = Math.floor(monthStart.getTime() / 1000);
  const before     = Math.floor(monthEnd.getTime()   / 1000);
  const activities = await fetchActivitiesForPeriod(athleteId, after, before);
  const data       = processActivities(activities, monthStart, { includeList: false });

  await redis.set(cacheKey, data, { ex: CACHE_TTL_HISTORY });
  return data;
}

// ── Historical week (weeksBack = 1 → last week, 2 → 2 weeks ago…) ────────────
export async function fetchHistoricalWeekStats(athleteId, weeksBack) {
  const weekStart  = getWeekStart(weeksBack);
  const cacheKey   = `${CACHE_KEY_PREFIX}:${athleteId}:${weekStart.toISOString().slice(0, 10)}`;
  const cached     = await redis.get(cacheKey);
  if (cached) return cached;

  const weekEnd    = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const after      = Math.floor(weekStart.getTime() / 1000);
  const before     = Math.floor(weekEnd.getTime()   / 1000);
  const activities = await fetchActivitiesForPeriod(athleteId, after, before);
  const data       = processActivities(activities, weekStart, { includeList: false });

  await redis.set(cacheKey, data, { ex: CACHE_TTL_HISTORY });
  return data;
}
