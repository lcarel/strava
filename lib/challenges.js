const RUNNING_TYPES = new Set(['Run', 'TrailRun']);

export const CHALLENGES = [

  // ── Course à pied — cumul ─────────────────────────────────────────────────
  { id: 'run_20km',  emoji: '🏃', label: '20 km de course',   desc: 'Cumuler 20 km en courant cette semaine',  type: 'distance', target: 20000,  sport: 'Run' },
  { id: 'run_30km',  emoji: '🏃', label: '30 km de course',   desc: 'Cumuler 30 km en courant cette semaine',  type: 'distance', target: 30000,  sport: 'Run' },
  { id: 'run_50km',  emoji: '🏃', label: '50 km de course',   desc: 'Cumuler 50 km en courant cette semaine',  type: 'distance', target: 50000,  sport: 'Run', premium: true },
  { id: 'run_3x',    emoji: '🏃', label: '3 sorties running', desc: 'Faire au moins 3 sorties de running',     type: 'count',    target: 3,      sport: 'Run' },
  { id: 'run_5x',    emoji: '🏃', label: '5 sorties running', desc: 'Faire au moins 5 sorties de running',     type: 'count',    target: 5,      sport: 'Run', premium: true },

  // ── Trail — cumul ─────────────────────────────────────────────────────────
  { id: 'trail_20km', emoji: '🌲', label: '20 km de trail',   desc: 'Cumuler 20 km en trail cette semaine',    type: 'distance', target: 20000,  sport: 'TrailRun' },
  { id: 'trail_30km', emoji: '🌲', label: '30 km de trail',   desc: 'Cumuler 30 km en trail cette semaine',    type: 'distance', target: 30000,  sport: 'TrailRun' },
  { id: 'trail_50km', emoji: '🌲', label: '50 km de trail',   desc: 'Cumuler 50 km en trail cette semaine',    type: 'distance', target: 50000,  sport: 'TrailRun', premium: true },
  { id: 'trail_3x',   emoji: '🌲', label: '3 sorties trail',  desc: 'Faire au moins 3 sorties de trail',       type: 'count',    target: 3,      sport: 'TrailRun' },

  // ── Course à pied — records ───────────────────────────────────────────────
  { id: 'run_longest_10',  emoji: '🦁', label: 'Course solo ≥ 10 km',        desc: 'Réaliser une seule course d\'au moins 10 km',         type: 'longest_run', target: 10000 },
  { id: 'run_longest_21',  emoji: '🦁', label: 'Semi-marathon solo',          desc: 'Réaliser une seule course d\'au moins 21,1 km',       type: 'longest_run', target: 21097, premium: true },
  { id: 'run_longest_42',  emoji: '💀', label: 'Marathon solo',               desc: 'Réaliser une seule course d\'au moins 42,2 km',       type: 'longest_run', target: 42195, premium: true },

  // ── Toutes activités running/trail — cumul ────────────────────────────────
  { id: 'any_50km',  emoji: '⚡', label: '50 km running/trail',  desc: '50 km au total, running et trail confondus',  type: 'distance', target: 50000,  sport: null },
  { id: 'any_100km', emoji: '⚡', label: '100 km running/trail', desc: '100 km au total, running et trail confondus', type: 'distance', target: 100000, sport: null, premium: true },
  { id: 'any_3x',    emoji: '⚡', label: '3 sorties',            desc: 'Réaliser au moins 3 sorties',                 type: 'count',    target: 3,      sport: null },
  { id: 'any_5x',    emoji: '⚡', label: '5 sorties',            desc: 'Réaliser au moins 5 sorties',                 type: 'count',    target: 5,      sport: null, premium: true },
  { id: 'any_7x',    emoji: '⚡', label: '7 sorties',            desc: 'Une sortie par jour de la semaine !',         type: 'count',    target: 7,      sport: null, premium: true },

  // ── Dénivelé — cumul ─────────────────────────────────────────────────────
  { id: 'elev_500',  emoji: '⛰️', label: '500 m de dénivelé',  desc: 'Cumuler 500 m de dénivelé positif',  type: 'elevation', target: 500,  sport: null },
  { id: 'elev_1000', emoji: '⛰️', label: '1000 m de dénivelé', desc: 'Cumuler 1000 m de dénivelé positif', type: 'elevation', target: 1000, sport: null },
  { id: 'elev_2000', emoji: '⛰️', label: '2000 m de dénivelé', desc: 'Cumuler 2000 m de dénivelé positif', type: 'elevation', target: 2000, sport: null, premium: true },
  { id: 'elev_3000', emoji: '⛰️', label: '3000 m de dénivelé', desc: 'Cumuler 3000 m de dénivelé positif', type: 'elevation', target: 3000, sport: null, premium: true },

  // ── Dénivelé — record sur une sortie ─────────────────────────────────────
  { id: 'climb_500',  emoji: '🏔️', label: '500 m+ en une sortie',  desc: 'Faire 500 m de dénivelé en une seule activité',  type: 'single_elevation', target: 500 },
  { id: 'climb_1000', emoji: '🏔️', label: '1000 m+ en une sortie', desc: 'Faire 1000 m de dénivelé en une seule activité', type: 'single_elevation', target: 1000, premium: true },
  { id: 'climb_2000', emoji: '🏔️', label: '2000 m+ en une sortie', desc: 'Faire 2000 m de dénivelé en une seule activité', type: 'single_elevation', target: 2000, premium: true },

  // ── Temps d'effort ────────────────────────────────────────────────────────
  { id: 'time_2h',  emoji: '⏱️', label: '2 h d\'effort',  desc: 'Accumuler 2 h de temps de mouvement',  type: 'time', target: 7200,  sport: null },
  { id: 'time_5h',  emoji: '⏱️', label: '5 h d\'effort',  desc: 'Accumuler 5 h de temps de mouvement',  type: 'time', target: 18000, sport: null, premium: true },
  { id: 'time_10h', emoji: '⏱️', label: '10 h d\'effort', desc: 'Accumuler 10 h de temps de mouvement', type: 'time', target: 36000, sport: null, premium: true },

  // ── Sessions longues — record ─────────────────────────────────────────────
  { id: 'session_2h', emoji: '🐢', label: '2h+ en une seule sortie', desc: 'Tenir au moins 2h de mouvement dans une seule activité', type: 'long_session', target: 7200 },
  { id: 'session_3h', emoji: '🐢', label: '3h+ en une seule sortie', desc: 'Tenir au moins 3h de mouvement dans une seule activité', type: 'long_session', target: 10800, premium: true },
  { id: 'session_5h', emoji: '🐢', label: '5h+ en une seule sortie', desc: 'Tenir au moins 5h de mouvement dans une seule activité', type: 'long_session', target: 18000, premium: true },

  // ── Régularité ────────────────────────────────────────────────────────────
  { id: 'days_5',       emoji: '📅', label: 'Bouger 5 jours',       desc: 'S\'activer au moins 5 jours différents dans la semaine',     type: 'active_days', target: 5 },
  { id: 'days_7',       emoji: '📅', label: 'Bouger tous les jours', desc: 'Une activité chaque jour de la semaine, sans exception',     type: 'active_days', target: 7, premium: true },
  { id: 'multi_sport',  emoji: '🎨', label: 'Running & Trail',       desc: 'Pratiquer à la fois le running et le trail cette semaine',   type: 'multi_sport',  target: 2 },
  { id: 'double_day',   emoji: '💪', label: 'Double journée',        desc: 'Faire 2 activités le même jour',                            type: 'double_day',   target: 1 },

  // ── Timing ────────────────────────────────────────────────────────────────
  { id: 'early_bird',   emoji: '🌅', label: 'Lève-tôt',    desc: 'Sortir avant 7h du matin',          type: 'early_bird', target: 1 },
  { id: 'early_bird_3', emoji: '🌅', label: '3× Lève-tôt', desc: 'Sortir avant 7h du matin 3 fois',   type: 'early_bird', target: 3, premium: true },
  { id: 'night_owl',    emoji: '🌙', label: 'Noctambule',   desc: 'Sortir après 21h au moins une fois', type: 'night_owl',  target: 1 },

  // ── Conditions météo ──────────────────────────────────────────────────────
  { id: 'cold_run',    emoji: '❄️', label: 'Course dans le froid',      desc: 'Courir par moins de 5°C (nécessite un capteur de température)', type: 'cold_run',    target: 1 },
  { id: 'hot_workout', emoji: '☀️', label: 'Sortie par temps chaud',    desc: 'S\'entraîner par plus de 25°C',                               type: 'hot_workout', target: 1 },
  { id: 'rain_run',    emoji: '🌧️', label: 'Sortie par tous les temps', desc: 'Sortir au moins 4 jours de suite quelle que soit la météo',  type: 'active_days', target: 4 },

];

export const CHALLENGE_CATEGORIES = [
  { label: 'Course à pied',   emoji: '🏃', ids: ['run_20km', 'run_30km', 'run_50km', 'run_3x', 'run_5x', 'run_longest_10', 'run_longest_21', 'run_longest_42'] },
  { label: 'Trail',           emoji: '🌲', ids: ['trail_20km', 'trail_30km', 'trail_50km', 'trail_3x'] },
  { label: 'Running & Trail', emoji: '⚡', ids: ['any_50km', 'any_100km', 'any_3x', 'any_5x', 'any_7x'] },
  { label: 'Dénivelé',        emoji: '⛰️', ids: ['elev_500', 'elev_1000', 'elev_2000', 'elev_3000', 'climb_500', 'climb_1000', 'climb_2000'] },
  { label: 'Longue sortie',   emoji: '🐢', ids: ['time_2h', 'time_5h', 'time_10h', 'session_2h', 'session_3h', 'session_5h'] },
  { label: 'Régularité',      emoji: '📅', ids: ['days_5', 'days_7', 'multi_sport', 'double_day'] },
  { label: 'Timing & Météo',  emoji: '🌡️', ids: ['early_bird', 'early_bird_3', 'night_owl', 'cold_run', 'hot_workout', 'rain_run'] },
];

export const CHALLENGE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 h

// ── Progress computation ───────────────────────────────────────────────────────
// Only activities within the challenge window [startedAt, startedAt + 72h] count.
export function computeProgress(stats, challenge) {
  const { type, target, sport } = challenge;

  // Determine the challenge time window
  const startedAt  = challenge.startedAt  ? new Date(challenge.startedAt).getTime()  : 0;
  const expiresAt  = startedAt > 0        ? startedAt + CHALLENGE_DURATION_MS        : Infinity;

  // Filter running activities to the challenge window.
  // Falls back to including the activity if start_date is missing (cache compat).
  const allActs = (stats.activities ?? []).filter(a => RUNNING_TYPES.has(a.sport_type || a.type));
  const acts = startedAt > 0
    ? allActs.filter(a => {
        const t = a.start_date != null ? new Date(a.start_date).getTime() : Infinity;
        return t >= startedAt && t < expiresAt;
      })
    : allActs;

  // Helpers
  const bySport = (arr, s) => s ? arr.filter(a => (a.sport_type || a.type) === s) : arr;
  const sum = (arr, field) => arr.reduce((s, a) => s + (a[field] ?? 0), 0);

  let value = 0;

  switch (type) {
    case 'distance':
      value = sum(bySport(acts, sport), 'distance');
      break;
    case 'count':
      value = bySport(acts, sport).length;
      break;
    case 'elevation':
      value = sum(bySport(acts, sport), 'total_elevation_gain');
      break;
    case 'time':
      value = sum(bySport(acts, sport), 'moving_time');
      break;
    case 'longest_run':
      value = Math.max(0, ...acts.map(a => a.distance ?? 0));
      break;
    case 'single_elevation':
      value = Math.max(0, ...acts.map(a => a.total_elevation_gain ?? 0));
      break;
    case 'long_session':
      value = Math.max(0, ...acts.map(a => a.moving_time ?? 0));
      break;
    case 'active_days': {
      const days = new Set(acts.map(a => a.start_date_local?.slice(0, 10)).filter(Boolean));
      value = days.size;
      break;
    }
    case 'multi_sport': {
      const sports = new Set(acts.map(a => a.sport_type || a.type).filter(Boolean));
      value = sports.size;
      break;
    }
    case 'double_day': {
      const counts = {};
      for (const a of acts) {
        const d = a.start_date_local?.slice(0, 10);
        if (d) counts[d] = (counts[d] || 0) + 1;
      }
      value = Object.values(counts).some(c => c >= 2) ? 1 : 0;
      break;
    }
    case 'early_bird':
      value = acts.filter(a => parseInt(a.start_date_local?.slice(11, 13) ?? '12', 10) < 7).length;
      break;
    case 'night_owl':
      value = acts.filter(a => parseInt(a.start_date_local?.slice(11, 13) ?? '12', 10) >= 21).length;
      break;
    case 'cold_run':
      value = acts.filter(a => a.average_temp !== null && a.average_temp < 5).length;
      break;
    case 'hot_workout':
      value = acts.filter(a => a.average_temp !== null && a.average_temp > 25).length;
      break;
    default:
      value = 0;
  }

  const pct = Math.min(100, Math.round((value / target) * 100));
  return { value, pct, completed: pct >= 100 };
}
