export const CHALLENGES = [
  // ── Running ──────────────────────────────────────────────────────────────────
  { id: 'run_20km',  emoji: '🏃', label: '20 km de course',      desc: 'Courir 20 km cette semaine',              type: 'distance',  target: 20000,  sport: 'Run' },
  { id: 'run_30km',  emoji: '🏃', label: '30 km de course',      desc: 'Courir 30 km cette semaine',              type: 'distance',  target: 30000,  sport: 'Run' },
  { id: 'run_50km',  emoji: '🏃', label: '50 km de course',      desc: 'Courir 50 km cette semaine',              type: 'distance',  target: 50000,  sport: 'Run' },
  { id: 'run_3x',    emoji: '🏃', label: '3 sorties running',    desc: 'Faire au moins 3 sorties de running',     type: 'count',     target: 3,      sport: 'Run' },
  { id: 'run_5x',    emoji: '🏃', label: '5 sorties running',    desc: 'Faire au moins 5 sorties de running',     type: 'count',     target: 5,      sport: 'Run' },

  // ── Cycling ───────────────────────────────────────────────────────────────────
  { id: 'ride_50km',  emoji: '🚴', label: 'Vélo 50 km',         desc: 'Parcourir 50 km à vélo',                  type: 'distance',  target: 50000,  sport: 'Ride' },
  { id: 'ride_100km', emoji: '🚴', label: 'Vélo 100 km',        desc: 'Parcourir 100 km à vélo',                 type: 'distance',  target: 100000, sport: 'Ride' },
  { id: 'ride_150km', emoji: '🚴', label: 'Vélo 150 km',        desc: 'Parcourir 150 km à vélo',                 type: 'distance',  target: 150000, sport: 'Ride' },
  { id: 'ride_3x',    emoji: '🚴', label: '3 sorties vélo',     desc: 'Faire au moins 3 sorties à vélo',         type: 'count',     target: 3,      sport: 'Ride' },

  // ── Toutes activités ─────────────────────────────────────────────────────────
  { id: 'any_50km',  emoji: '⚡', label: '50 km toutes activités',  desc: '50 km au total, tous sports confondus',  type: 'distance',  target: 50000,  sport: null },
  { id: 'any_100km', emoji: '⚡', label: '100 km toutes activités', desc: '100 km au total, tous sports confondus', type: 'distance',  target: 100000, sport: null },
  { id: 'any_3x',    emoji: '⚡', label: '3 activités',            desc: 'Réaliser au moins 3 activités',         type: 'count',     target: 3,      sport: null },
  { id: 'any_5x',    emoji: '⚡', label: '5 activités',            desc: 'Réaliser au moins 5 activités',         type: 'count',     target: 5,      sport: null },
  { id: 'any_7x',    emoji: '⚡', label: '7 activités',            desc: 'Une activité par jour !',               type: 'count',     target: 7,      sport: null },

  // ── Dénivelé ─────────────────────────────────────────────────────────────────
  { id: 'elev_500',  emoji: '⛰️', label: '500 m de dénivelé',  desc: 'Cumuler 500 m de dénivelé positif',      type: 'elevation', target: 500,    sport: null },
  { id: 'elev_1000', emoji: '⛰️', label: '1000 m de dénivelé', desc: 'Cumuler 1000 m de dénivelé positif',     type: 'elevation', target: 1000,   sport: null },
  { id: 'elev_2000', emoji: '⛰️', label: '2000 m de dénivelé', desc: 'Cumuler 2000 m de dénivelé positif',     type: 'elevation', target: 2000,   sport: null },
  { id: 'elev_3000', emoji: '⛰️', label: '3000 m de dénivelé', desc: 'Cumuler 3000 m de dénivelé positif',     type: 'elevation', target: 3000,   sport: null },

  // ── Temps d'effort ────────────────────────────────────────────────────────────
  { id: 'time_2h',  emoji: '⏱️', label: '2 h d\'effort',  desc: 'Accumuler 2 h de temps de mouvement',   type: 'time', target: 7200,  sport: null },
  { id: 'time_5h',  emoji: '⏱️', label: '5 h d\'effort',  desc: 'Accumuler 5 h de temps de mouvement',   type: 'time', target: 18000, sport: null },
  { id: 'time_10h', emoji: '⏱️', label: '10 h d\'effort', desc: 'Accumuler 10 h de temps de mouvement',  type: 'time', target: 36000, sport: null },
];

export const CHALLENGE_CATEGORIES = [
  { label: 'Course à pied', sport: 'Run',  emoji: '🏃', ids: ['run_20km', 'run_30km', 'run_50km', 'run_3x', 'run_5x'] },
  { label: 'Vélo',          sport: 'Ride', emoji: '🚴', ids: ['ride_50km', 'ride_100km', 'ride_150km', 'ride_3x'] },
  { label: 'Toutes activités',             emoji: '⚡', ids: ['any_50km', 'any_100km', 'any_3x', 'any_5x', 'any_7x'] },
  { label: 'Dénivelé',                     emoji: '⛰️', ids: ['elev_500', 'elev_1000', 'elev_2000', 'elev_3000'] },
  { label: 'Temps d\'effort',              emoji: '⏱️', ids: ['time_2h', 'time_5h', 'time_10h'] },
];

export function computeProgress(stats, challenge) {
  const { type, target, sport } = challenge;
  let value = 0;

  if (sport) {
    const s = stats.by_sport[sport] ?? {};
    if (type === 'distance')  value = s.distance    ?? 0;
    if (type === 'count')     value = s.count        ?? 0;
    if (type === 'elevation') value = s.elevation    ?? 0;
    if (type === 'time')      value = s.moving_time  ?? 0;
  } else {
    if (type === 'distance')  value = stats.totals.distance;
    if (type === 'count')     value = stats.totals.count;
    if (type === 'elevation') value = stats.totals.elevation;
    if (type === 'time')      value = stats.totals.moving_time;
  }

  const pct = Math.min(100, Math.round((value / target) * 100));
  return { value, pct, completed: pct >= 100 };
}
