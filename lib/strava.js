import redis from './redis.js';

const CACHE_TTL = 300; // 5 min

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

// ── Week stats ────────────────────────────────────────────────────────────────
export function getWeekStart() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function fetchWeekStats(athleteId) {
  const cacheKey = `stats:${athleteId}:${getWeekStart().toISOString().slice(0, 10)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const token = await getValidToken(athleteId);
  const after = Math.floor(getWeekStart().getTime() / 1000);

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error('Strava API error');
  const activities = await res.json();

  const by_sport = {};
  for (const act of activities) {
    const type = act.sport_type || act.type;
    if (!by_sport[type]) by_sport[type] = { count: 0, distance: 0, moving_time: 0, elevation: 0 };
    by_sport[type].count += 1;
    by_sport[type].distance += act.distance;
    by_sport[type].moving_time += act.moving_time;
    by_sport[type].elevation += act.total_elevation_gain;
  }

  const totals = activities.reduce(
    (acc, act) => ({
      count: acc.count + 1,
      distance: acc.distance + act.distance,
      moving_time: acc.moving_time + act.moving_time,
      elevation: acc.elevation + act.total_elevation_gain,
    }),
    { count: 0, distance: 0, moving_time: 0, elevation: 0 }
  );

  const filteredActivities = activities.map(({ name, sport_type, type, distance, moving_time, total_elevation_gain, start_date_local, average_temp }) => ({
    name, sport_type, type, distance, moving_time, total_elevation_gain, start_date_local,
    average_temp: average_temp ?? null,
  }));
  const data = { totals, by_sport, activities: filteredActivities, week_start: getWeekStart().toISOString() };
  await redis.set(cacheKey, data, { ex: CACHE_TTL });
  return data;
}
