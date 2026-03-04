const SPORT_ICONS = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', Walk: '🚶', Hike: '🥾',
  WeightTraining: '🏋️', Yoga: '🧘', Skiing: '⛷️', Snowboard: '🏂',
  Rowing: '🚣', Kayaking: '🛶', Soccer: '⚽', Tennis: '🎾',
  Golf: '⛳', Crossfit: '💪', Elliptical: '🔄', StairStepper: '🪜',
  VirtualRide: '🚴', VirtualRun: '🏃', TrailRun: '🥾',
  default: '⚡',
};

const MEDALS = ['🥇', '🥈', '🥉'];

let currentAthleteId = null;
let currentMetric = 'distance';

function sportIcon(type) { return SPORT_ICONS[type] || SPORT_ICONS.default; }

function fmtDistance(m) {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
  return Math.round(m) + ' m';
}

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}min`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function metricValue(totals, metric) {
  if (metric === 'time') return fmtTime(totals.moving_time);
  if (metric === 'activities') return totals.count;
  if (metric === 'elevation') return totals.elevation > 0 ? Math.round(totals.elevation) + ' m' : '–';
  return totals.distance > 0 ? fmtDistance(totals.distance) : '–';
}

function metricRaw(totals, metric) {
  if (metric === 'time') return totals.moving_time;
  if (metric === 'activities') return totals.count;
  if (metric === 'elevation') return totals.elevation;
  return totals.distance;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('error')) { alert('Connexion refusée ou erreur Strava.'); }
  history.replaceState({}, '', '/');

  const status = await fetch('/api/status').then(r => r.json());

  if (status.connected) {
    currentAthleteId = String(status.athlete.id);
    document.getElementById('athlete-badge').textContent =
      `${status.athlete.firstname} ${status.athlete.lastname}`;
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('landing').classList.add('hidden');
    loadMyStats();
  } else {
    document.getElementById('landing').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    document.getElementById(target).classList.remove('hidden');
    if (target === 'leaderboard') loadLeaderboard();
  });
});

// ── Metric selector ───────────────────────────────────────────────────────────
document.querySelectorAll('.metric-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMetric = btn.dataset.metric;
    loadLeaderboard();
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
});

// ── My stats ──────────────────────────────────────────────────────────────────
async function loadMyStats() {
  document.getElementById('stats-loading').classList.remove('hidden');
  try {
    const data = await fetch('/api/stats/week').then(r => r.json());
    if (data.error) throw new Error(data.error);
    renderMyStats(data);
  } catch (err) {
    console.error(err);
  } finally {
    document.getElementById('stats-loading').classList.add('hidden');
  }
}

function renderMyStats({ totals, by_sport, activities, week_start }) {
  const weekStart = new Date(week_start);
  const today = new Date();
  document.getElementById('week-label').textContent =
    `Semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ` +
    `au ${today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

  document.getElementById('total-count').textContent = totals.count;
  document.getElementById('total-distance').textContent = totals.distance > 0 ? fmtDistance(totals.distance) : '–';
  document.getElementById('total-time').textContent = totals.moving_time > 0 ? fmtTime(totals.moving_time) : '–';
  document.getElementById('total-elevation').textContent = totals.elevation > 0 ? Math.round(totals.elevation) + ' m' : '–';

  if (totals.count === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
    return;
  }

  // By sport
  const sportGrid = document.getElementById('sport-grid');
  sportGrid.innerHTML = '';
  for (const [type, s] of Object.entries(by_sport)) {
    const card = document.createElement('div');
    card.className = 'sport-card';
    card.innerHTML = `
      <div class="sport-name">${sportIcon(type)} ${type}</div>
      <div class="sport-meta">
        <span class="sport-pill">${s.count} sortie${s.count > 1 ? 's' : ''}</span>
        ${s.distance > 0 ? `<span class="sport-pill">${fmtDistance(s.distance)}</span>` : ''}
        <span class="sport-pill">${fmtTime(s.moving_time)}</span>
        ${s.elevation > 0 ? `<span class="sport-pill">+${Math.round(s.elevation)} m</span>` : ''}
      </div>
    `;
    sportGrid.appendChild(card);
  }
  document.getElementById('sport-section').classList.remove('hidden');

  // Activities
  const list = document.getElementById('activity-list');
  list.innerHTML = '';
  for (const act of activities) {
    const type = act.sport_type || act.type;
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon">${sportIcon(type)}</div>
      <div class="activity-info">
        <div class="activity-name">${act.name}</div>
        <div class="activity-date">${fmtDate(act.start_date_local)}</div>
      </div>
      <div class="activity-stats">
        ${act.distance > 0 ? `
          <div class="activity-stat-item">
            <div class="activity-stat-value">${fmtDistance(act.distance)}</div>
            <div class="activity-stat-label">Distance</div>
          </div>` : ''}
        <div class="activity-stat-item">
          <div class="activity-stat-value">${fmtTime(act.moving_time)}</div>
          <div class="activity-stat-label">Durée</div>
        </div>
        ${act.total_elevation_gain > 0 ? `
          <div class="activity-stat-item">
            <div class="activity-stat-value">+${Math.round(act.total_elevation_gain)} m</div>
            <div class="activity-stat-label">Dénivelé</div>
          </div>` : ''}
      </div>
    `;
    list.appendChild(item);
  }
  document.getElementById('activities-section').classList.remove('hidden');
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const lbLoading = document.getElementById('lb-loading');
  const lbList = document.getElementById('lb-list');
  const lbEmpty = document.getElementById('lb-empty');

  lbLoading.classList.remove('hidden');
  lbList.innerHTML = '';
  lbEmpty.classList.add('hidden');

  try {
    const data = await fetch(`/api/leaderboard?metric=${currentMetric}`).then(r => r.json());
    if (data.error) throw new Error(data.error);
    renderLeaderboard(data);
  } catch (err) {
    console.error(err);
  } finally {
    lbLoading.classList.add('hidden');
  }
}

function renderLeaderboard({ leaderboard, metric, week_start }) {
  const weekStart = new Date(week_start);
  const today = new Date();
  document.getElementById('lb-week-label').textContent =
    `Semaine du ${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ` +
    `au ${today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

  const lbList = document.getElementById('lb-list');
  const lbEmpty = document.getElementById('lb-empty');

  if (leaderboard.length === 0) {
    lbEmpty.classList.remove('hidden');
    return;
  }

  const maxVal = Math.max(...leaderboard.map(e => metricRaw(e.totals, metric)), 1);

  leaderboard.forEach((entry, i) => {
    const rank = i + 1;
    const isMe = entry.athlete.id === currentAthleteId;
    const sports = Object.keys(entry.by_sport);
    const val = metricRaw(entry.totals, metric);
    const barPct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;

    const item = document.createElement('div');
    item.className = `lb-item rank-${rank}`;

    item.innerHTML = `
      <div class="lb-rank">${MEDALS[i] || rank}</div>
      <div class="lb-avatar">
        ${entry.athlete.profile_medium
          ? `<img src="${entry.athlete.profile_medium}" alt="" />`
          : '👤'}
      </div>
      <div class="lb-info" style="flex:1">
        <div class="lb-name ${isMe ? 'is-me' : ''}">
          ${entry.athlete.firstname} ${entry.athlete.lastname}
        </div>
        ${entry.athlete.city ? `<div class="lb-city">📍 ${entry.athlete.city}</div>` : ''}
        <div class="lb-sports">
          ${sports.map(s => `<span class="lb-sport-tag">${sportIcon(s)} ${s}</span>`).join('')}
        </div>
        <div class="lb-bar-track">
          <div class="lb-bar-fill" style="width: ${barPct}%"></div>
        </div>
      </div>
      <div class="lb-secondary">
        <span class="lb-sec-item">${entry.totals.count} activité${entry.totals.count > 1 ? 's' : ''}</span>
        ${entry.totals.distance > 0 ? `<span class="lb-sec-item"><strong>${fmtDistance(entry.totals.distance)}</strong></span>` : ''}
        <span class="lb-sec-item"><strong>${fmtTime(entry.totals.moving_time)}</strong></span>
      </div>
      <div class="lb-metric">
        <div class="lb-metric-value">${metricValue(entry.totals, metric)}</div>
        <div class="lb-metric-label">${
          metric === 'distance' ? 'distance' :
          metric === 'time' ? 'temps' :
          metric === 'activities' ? 'activités' : 'dénivelé'
        }</div>
      </div>
    `;
    lbList.appendChild(item);
  });
}

init();
