import { getSession } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession(req, res);
  session.destroy();
  res.json({ ok: true });
}
