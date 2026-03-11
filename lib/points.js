// ── Points scoring ─────────────────────────────────────────────────────────────
// 1 pt  per km       (distance in metres → ÷ 1 000)
// 1 pt  per 50 m D+  (elevation in metres → ÷ 50)
// +20 pts bonus if the active league challenge is completed (leagues only)

export function computePoints(totals, challengeCompleted = false) {
  const pts = totals.distance / 1000 + totals.elevation / 50;
  return Math.round(pts) + (challengeCompleted ? 20 : 0);
}
