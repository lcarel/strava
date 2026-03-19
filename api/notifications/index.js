import { getSession } from '../../lib/session.js';
import { getNotifications, markAllRead } from '../../lib/notifications.js';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Not connected' });

  if (req.method === 'GET') {
    const notifications = await getNotifications(session.athleteId);
    return res.json({ notifications });
  }

  if (req.method === 'POST') {
    // POST = marquer toutes lues
    await markAllRead(session.athleteId);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
