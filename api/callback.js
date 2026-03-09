import { getSession } from '../lib/session.js';
import { saveUser } from '../lib/strava.js';
import redis from '../lib/redis.js';

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?error=access_denied');

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Token exchange failed');

    const athleteId = String(data.athlete.id);

    // Refuse login for banned athletes
    const isBanned = await redis.sismember('banned:athletes', athleteId);
    if (isBanned) return res.redirect('/?error=access_denied');

    await saveUser(athleteId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      athlete: data.athlete,
    });

    // Register in the global athletes set (for leaderboard)
    await redis.sadd('athletes', athleteId);

    const session = await getSession(req, res);
    session.athleteId = athleteId;
    await session.save();

    res.redirect('/?connected=true');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?error=token_failed');
  }
}
