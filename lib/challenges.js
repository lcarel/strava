const RUNNING_TYPES = new Set(['Run', 'TrailRun']);

export const CHALLENGES = [

  // ── Course à pied ─────────────────────────────────────────────────────────
  { id: 'run_3x',         emoji: '🏃', label: '3 sorties running',     desc: 'Faire au moins 3 sorties de running',            type: 'count',    target: 3,     sport: 'Run' },
  { id: 'run_5x',         emoji: '🏃', label: '5 sorties running',     desc: 'Faire au moins 5 sorties de running',            type: 'count',    target: 5,     sport: 'Run', premium: true },
  { id: 'run_longest_10', emoji: '🦁', label: 'Course solo ≥ 10 km',  desc: 'Réaliser une seule course d\'au moins 10 km',    type: 'longest_run', target: 10000 },
  { id: 'run_longest_21', emoji: '🦁', label: 'Semi-marathon solo',    desc: 'Réaliser une seule course d\'au moins 21,1 km',  type: 'longest_run', target: 21097, premium: true },

  // ── Trail ─────────────────────────────────────────────────────────────────
  { id: 'trail_3x',       emoji: '🌲', label: '3 sorties trail',       desc: 'Faire au moins 3 sorties de trail',              type: 'count',    target: 3,     sport: 'TrailRun' },
  { id: 'trail_long',     emoji: '🌲', label: 'Trail solo ≥ 15 km',   desc: 'Réaliser un trail d\'au moins 15 km en une fois', type: 'longest_run', target: 15000, sport: 'TrailRun', premium: true },

  // ── Running & Trail mélangés ──────────────────────────────────────────────
  { id: 'any_3x',         emoji: '⚡', label: '3 sorties',             desc: 'Réaliser au moins 3 sorties (running ou trail)', type: 'count',    target: 3,     sport: null },
  { id: 'any_5x',         emoji: '⚡', label: '5 sorties',             desc: 'Réaliser au moins 5 sorties (running ou trail)', type: 'count',    target: 5,     sport: null, premium: true },
  { id: 'multi_sport',    emoji: '🎨', label: 'Running & Trail',       desc: 'Pratiquer à la fois le running et le trail',     type: 'multi_sport', target: 2 },

  // ── Dénivelé ──────────────────────────────────────────────────────────────
  { id: 'elev_500',       emoji: '⛰️', label: '500 m de dénivelé',    desc: 'Cumuler 500 m de dénivelé positif',             type: 'elevation', target: 500 },
  { id: 'elev_1000',      emoji: '⛰️', label: '1000 m de dénivelé',   desc: 'Cumuler 1000 m de dénivelé positif',            type: 'elevation', target: 1000, premium: true },
  { id: 'climb_500',      emoji: '🏔️', label: '500 m+ en une sortie', desc: 'Faire 500 m de dénivelé en une seule activité', type: 'single_elevation', target: 500 },

  // ── Social ────────────────────────────────────────────────────────────────
  { id: 'group_run',      emoji: '🫂', label: 'Sortie en groupe',      desc: 'Courir avec au moins 2 amis (activité de groupe Strava)', type: 'group_run', target: 1 },
  { id: 'group_run_3',    emoji: '🫂', label: '3 sorties en groupe',   desc: 'Faire 3 sorties de groupe Strava',                        type: 'group_run', target: 3, premium: true },

  // ── Timing ────────────────────────────────────────────────────────────────
  { id: 'early_bird',     emoji: '🌅', label: 'Lève-tôt',              desc: 'Sortir avant 7h du matin',                      type: 'early_bird', target: 1 },
  { id: 'early_bird_3',   emoji: '🌅', label: '3× Lève-tôt',          desc: 'Sortir avant 7h du matin à 3 reprises',         type: 'early_bird', target: 3, premium: true },
  { id: 'lunch_run',      emoji: '🍽️', label: 'Course du midi',        desc: 'Courir entre 12h et 14h',                       type: 'lunch_run',  target: 1 },
  { id: 'evening_run',    emoji: '🌆', label: 'Sortie après le boulot',desc: 'Courir entre 17h et 20h',                       type: 'evening_run', target: 1 },
  { id: 'night_owl',      emoji: '🌙', label: 'Noctambule',            desc: 'Sortir après 21h au moins une fois',            type: 'night_owl',  target: 1 },

  // ── Style ─────────────────────────────────────────────────────────────────
  { id: 'slow_run',       emoji: '🐌', label: 'Zone 1 (≥ 6:45/km)',   desc: 'Courir en allure tranquille ≥ 6:45/km sur au moins 3 km', type: 'slow_run', target: 1 },
  { id: 'parkrun',        emoji: '🎯', label: 'Le classique 5 km',     desc: 'Faire exactement ~5 km (entre 4,75 et 5,25 km)', type: 'parkrun',    target: 1 },
  { id: 'double_day',     emoji: '💪', label: 'Double journée',        desc: 'Faire 2 activités dans la même journée',        type: 'double_day', target: 1 },

  // ── Régularité ────────────────────────────────────────────────────────────
  { id: 'weekend_both',   emoji: '🗓️', label: 'Week-end running',     desc: 'Courir le samedi ET le dimanche',               type: 'weekend_both',   target: 2 },
  { id: 'consecutive_3',  emoji: '🔥', label: '3 jours de suite',      desc: 'Courir 3 jours consécutifs',                    type: 'consecutive_days', target: 3, premium: true },
  { id: 'days_5',         emoji: '📅', label: 'Bouger 5 jours',        desc: 'S\'activer au moins 5 jours différents',        type: 'active_days', target: 5 },

];

export const CHALLENGE_CATEGORIES = [
  { label: 'Course à pied',   emoji: '🏃',  ids: ['run_3x', 'run_5x', 'run_longest_10', 'run_longest_21'] },
  { label: 'Trail',           emoji: '🌲',  ids: ['trail_3x', 'trail_long'] },
  { label: 'Running & Trail', emoji: '⚡',  ids: ['any_3x', 'any_5x', 'multi_sport'] },
  { label: 'Dénivelé',        emoji: '⛰️',  ids: ['elev_500', 'elev_1000', 'climb_500'] },
  { label: 'Social',          emoji: '🫂',  ids: ['group_run', 'group_run_3'] },
  { label: 'Timing',          emoji: '⏰',  ids: ['early_bird', 'early_bird_3', 'lunch_run', 'evening_run', 'night_owl'] },
  { label: 'Style & Fun',     emoji: '🎯',  ids: ['slow_run', 'parkrun', 'double_day'] },
  { label: 'Régularité',      emoji: '📅',  ids: ['weekend_both', 'consecutive_3', 'days_5'] },
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
      value = Math.max(0, ...bySport(acts, sport ?? null).map(a => a.distance ?? 0));
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
    case 'lunch_run':
      value = acts.filter(a => {
        const h = parseInt(a.start_date_local?.slice(11, 13) ?? '-1', 10);
        return h >= 12 && h < 14;
      }).length;
      break;
    case 'evening_run':
      value = acts.filter(a => {
        const h = parseInt(a.start_date_local?.slice(11, 13) ?? '-1', 10);
        return h >= 17 && h < 20;
      }).length;
      break;
    case 'night_owl':
      value = acts.filter(a => parseInt(a.start_date_local?.slice(11, 13) ?? '12', 10) >= 21).length;
      break;
    case 'group_run':
      // athlete_count >= 3 means at least 2 friends + you
      value = acts.filter(a => (a.athlete_count ?? 1) >= 3).length;
      break;
    case 'slow_run': {
      // Zone 1 = allure >= 6:45/km → average_speed <= 1000/405 m/s ≈ 2.47 m/s
      const MAX_SPEED = 1000 / 405;
      value = acts.filter(a =>
        a.average_speed != null && a.average_speed > 0 &&
        a.average_speed <= MAX_SPEED &&
        (a.distance ?? 0) >= 3000
      ).length;
      break;
    }
    case 'parkrun':
      // ~5 km : entre 4,75 et 5,25 km
      value = acts.filter(a => (a.distance ?? 0) >= 4750 && (a.distance ?? 0) <= 5250).length;
      break;
    case 'weekend_both': {
      // Besoin d'un samedi (6) ET d'un dimanche (0)
      const hasSat = acts.some(a => {
        const d = a.start_date_local?.slice(0, 10);
        return d && new Date(d).getDay() === 6;
      });
      const hasSun = acts.some(a => {
        const d = a.start_date_local?.slice(0, 10);
        return d && new Date(d).getDay() === 0;
      });
      value = (hasSat ? 1 : 0) + (hasSun ? 1 : 0);
      break;
    }
    case 'consecutive_days': {
      const days = [...new Set(acts.map(a => a.start_date_local?.slice(0, 10)).filter(Boolean))].sort();
      let maxStreak = days.length > 0 ? 1 : 0;
      let streak = days.length > 0 ? 1 : 0;
      for (let i = 1; i < days.length; i++) {
        const diff = (new Date(days[i]) - new Date(days[i - 1])) / (24 * 60 * 60 * 1000);
        streak = diff === 1 ? streak + 1 : 1;
        if (streak > maxStreak) maxStreak = streak;
      }
      value = maxStreak;
      break;
    }
    default:
      value = 0;
  }

  const pct = Math.min(100, Math.round((value / target) * 100));
  return { value, pct, completed: pct >= 100 };
}
