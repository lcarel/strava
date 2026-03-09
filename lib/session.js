import { getIronSession } from 'iron-session';

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'SESSION_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32'
  );
}

const sessionOptions = {
  password: secret,
  cookieName: 'strava-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  },
};

export function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
