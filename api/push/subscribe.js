import { getSession } from '../../lib/session.js';
import { saveSubscription } from '../../lib/push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription invalide' });

  await saveSubscription(session.athleteId, subscription);
  res.json({ ok: true });
}
