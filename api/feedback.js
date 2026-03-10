import { getSession } from '../lib/session.js';
import redis from '../lib/redis.js';

const MAX_COMMENT_LENGTH = 500;
const MAX_FEEDBACKS_STORED = 5000;
const RATE_LIMIT_TTL_SECONDS = 86400; // 1 feedback par utilisateur par 24h

function sanitizeComment(raw) {
  return String(raw || '')
    // Strip null bytes and non-printable control chars (keep \n and \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse more than 3 consecutive newlines
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await getSession(req, res);
  if (!session.athleteId) return res.status(401).json({ error: 'Non connecté' });

  const athleteId = String(session.athleteId);

  // ── Rate limiting — 1 avis par 24h par utilisateur ─────────────────────────
  const rlKey = `feedback:rl:${athleteId}`;
  const alreadySubmitted = await redis.set(rlKey, '1', { nx: true, ex: RATE_LIMIT_TTL_SECONDS });
  if (alreadySubmitted === null) {
    // Key existed → already submitted recently
    return res.status(429).json({ error: 'Tu as déjà soumis un avis récemment. Réessaie dans 24h.' });
  }

  // ── Body validation ─────────────────────────────────────────────────────────
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  // ── Rating validation — entier strict entre 1 et 5 ─────────────────────────
  const rawRating = body.rating;
  const rating = Number(rawRating);
  if (
    !Number.isFinite(rating) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    // Undo rate limit key so they can retry with a valid payload
    await redis.del(rlKey);
    return res.status(400).json({ error: 'Note invalide (entier entre 1 et 5 requis)' });
  }

  // ── Comment sanitization ────────────────────────────────────────────────────
  const comment = sanitizeComment(body.comment);

  // ── Redis cap — évite de saturer le stockage ────────────────────────────────
  const listLen = await redis.llen('feedbacks');
  if (listLen >= MAX_FEEDBACKS_STORED) {
    return res.status(503).json({ error: 'Limite de stockage atteinte, contactez un administrateur.' });
  }

  // ── Persist ─────────────────────────────────────────────────────────────────
  const feedback = {
    athleteId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  await redis.lpush('feedbacks', JSON.stringify(feedback));

  return res.status(200).json({ ok: true });
}
