import { getIronSession } from 'iron-session';

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'strava-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60,
  },
};

export function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
