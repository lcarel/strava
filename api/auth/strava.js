export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read',
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
