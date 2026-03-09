const SPORT_ICONS = {
  Run: '🏃', Ride: '🚴', Swim: '🏊', Walk: '🚶', Hike: '🥾',
  WeightTraining: '🏋️', Yoga: '🧘', Skiing: '⛷️', Snowboard: '🏂',
  Rowing: '🚣', Kayaking: '🛶', Soccer: '⚽', Tennis: '🎾',
  Golf: '⛳', Crossfit: '💪', Elliptical: '🔄', StairStepper: '🪜',
  VirtualRide: '🚴', VirtualRun: '🏃', TrailRun: '🥾',
  default: '⚡',
};
const MEDALS = ['🥇', '🥈', '🥉'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let currentAthleteId = null;
let currentMetric = 'distance';
let currentLeagueMetric = 'distance';
let currentLeagueId = null;

// ── Formatters ────────────────────────────────────────────────────────────────
const sportIcon = t => SPORT_ICONS[t] || SPORT_ICONS.default;

function fmtDistance(m) {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
  return Math.round(m) + ' m';
}

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
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

function metricLabel(metric) {
  return { distance: 'distance', time: 'temps', activities: 'activités', elevation: 'dénivelé' }[metric];
}

function weekRangeLabel(week_start) {
  const s = new Date(week_start), e = new Date();
  return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('error')) alert('Connexion refusée ou erreur Strava.');
  history.replaceState({}, '', '/');

  const status = await fetch('/api/status').then(r => r.json());
  if (status.connected) {
    currentAthleteId = String(status.athlete.id);
    document.getElementById('athlete-badge').textContent = `${status.athlete.firstname} ${status.athlete.lastname}`;
    if (status.isAdmin) document.getElementById('admin-link').classList.remove('hidden');
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
    const tab = btn.dataset.tab;
    document.getElementById(tab).classList.remove('hidden');
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'leagues') loadLeagues();
  });
});

// ── Global metric selectors ───────────────────────────────────────────────────
document.querySelectorAll('#lb-metric-btns .metric-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#lb-metric-btns .metric-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMetric = btn.dataset.metric;
    loadLeaderboard();
  });
});

document.querySelectorAll('#league-metric-btns .metric-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#league-metric-btns .metric-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLeagueMetric = btn.dataset.metric;
    if (currentLeagueId) loadLeagueDetail(currentLeagueId);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', async () => {
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
  } catch (err) { console.error(err); }
  finally { document.getElementById('stats-loading').classList.add('hidden'); }
}

function renderMyStats({ totals, by_sport, activities, week_start }) {
  document.getElementById('week-label').textContent = weekRangeLabel(week_start);
  document.getElementById('total-count').textContent = totals.count;
  document.getElementById('total-distance').textContent = totals.distance > 0 ? fmtDistance(totals.distance) : '–';
  document.getElementById('total-time').textContent = totals.moving_time > 0 ? fmtTime(totals.moving_time) : '–';
  document.getElementById('total-elevation').textContent = totals.elevation > 0 ? Math.round(totals.elevation) + ' m' : '–';

  if (totals.count === 0) { document.getElementById('empty-state').classList.remove('hidden'); return; }

  const sportGrid = document.getElementById('sport-grid');
  sportGrid.innerHTML = '';
  for (const [type, s] of Object.entries(by_sport)) {
    const card = document.createElement('div');
    card.className = 'sport-card';
    card.innerHTML = `
      <div class="sport-name">${sportIcon(type)} ${escapeHtml(type)}</div>
      <div class="sport-meta">
        <span class="sport-pill">${s.count} sortie${s.count > 1 ? 's' : ''}</span>
        ${s.distance > 0 ? `<span class="sport-pill">${fmtDistance(s.distance)}</span>` : ''}
        <span class="sport-pill">${fmtTime(s.moving_time)}</span>
        ${s.elevation > 0 ? `<span class="sport-pill">+${Math.round(s.elevation)} m</span>` : ''}
      </div>`;
    sportGrid.appendChild(card);
  }
  document.getElementById('sport-section').classList.remove('hidden');

  const list = document.getElementById('activity-list');
  list.innerHTML = '';
  for (const act of activities) {
    const type = act.sport_type || act.type;
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-icon">${sportIcon(type)}</div>
      <div class="activity-info">
        <div class="activity-name">${escapeHtml(act.name)}</div>
        <div class="activity-date">${fmtDate(act.start_date_local)}</div>
      </div>
      <div class="activity-stats">
        ${act.distance > 0 ? `<div class="activity-stat-item"><div class="activity-stat-value">${fmtDistance(act.distance)}</div><div class="activity-stat-label">Distance</div></div>` : ''}
        <div class="activity-stat-item"><div class="activity-stat-value">${fmtTime(act.moving_time)}</div><div class="activity-stat-label">Durée</div></div>
        ${act.total_elevation_gain > 0 ? `<div class="activity-stat-item"><div class="activity-stat-value">+${Math.round(act.total_elevation_gain)} m</div><div class="activity-stat-label">Dénivelé</div></div>` : ''}
      </div>`;
    list.appendChild(item);
  }
  document.getElementById('activities-section').classList.remove('hidden');
}

// ── Global leaderboard ────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const loading = document.getElementById('lb-loading');
  document.getElementById('lb-list').innerHTML = '';
  document.getElementById('lb-empty').classList.add('hidden');
  loading.classList.remove('hidden');
  try {
    const data = await fetch(`/api/leaderboard?metric=${currentMetric}`).then(r => r.json());
    if (data.error) throw new Error(data.error);
    document.getElementById('lb-week-label').textContent = weekRangeLabel(data.week_start);
    renderLeaderboard(data.leaderboard, currentMetric, 'lb-list', 'lb-empty');
  } catch (err) { console.error(err); }
  finally { loading.classList.add('hidden'); }
}

function renderLeaderboard(leaderboard, metric, listId, emptyId) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.innerHTML = '';

  if (leaderboard.length === 0) { empty.classList.remove('hidden'); return; }

  const maxVal = Math.max(...leaderboard.map(e => metricRaw(e.totals, metric)), 1);

  leaderboard.forEach((entry, i) => {
    const isMe = entry.athlete.id === currentAthleteId;
    const sports = Object.keys(entry.by_sport);
    const barPct = maxVal > 0 ? Math.round((metricRaw(entry.totals, metric) / maxVal) * 100) : 0;

    const item = document.createElement('div');
    item.className = `lb-item rank-${i + 1}`;
    item.innerHTML = `
      <div class="lb-rank">${MEDALS[i] || i + 1}</div>
      <div class="lb-avatar">${entry.athlete.profile_medium ? `<img src="${escapeHtml(entry.athlete.profile_medium)}" alt="" />` : '👤'}</div>
      <div class="lb-info" style="flex:1">
        <div class="lb-name ${isMe ? 'is-me' : ''}">${escapeHtml(entry.athlete.firstname)} ${escapeHtml(entry.athlete.lastname)}</div>
        ${entry.athlete.city ? `<div class="lb-city">📍 ${escapeHtml(entry.athlete.city)}</div>` : ''}
        <div class="lb-sports">${sports.map(s => `<span class="lb-sport-tag">${sportIcon(s)} ${escapeHtml(s)}</span>`).join('')}</div>
        <div class="lb-bar-track"><div class="lb-bar-fill" style="width:${barPct}%"></div></div>
      </div>
      <div class="lb-secondary">
        <span class="lb-sec-item">${entry.totals.count} activité${entry.totals.count > 1 ? 's' : ''}</span>
        ${entry.totals.distance > 0 ? `<span class="lb-sec-item"><strong>${fmtDistance(entry.totals.distance)}</strong></span>` : ''}
        <span class="lb-sec-item"><strong>${fmtTime(entry.totals.moving_time)}</strong></span>
      </div>
      <div class="lb-metric">
        <div class="lb-metric-value">${metricValue(entry.totals, metric)}</div>
        <div class="lb-metric-label">${metricLabel(metric)}</div>
      </div>`;
    list.appendChild(item);
  });
}

// ── Leagues list ──────────────────────────────────────────────────────────────
async function loadLeagues() {
  showLeaguesList();
  document.getElementById('leagues-loading').classList.remove('hidden');
  document.getElementById('leagues-grid').innerHTML = '';
  document.getElementById('leagues-empty').classList.add('hidden');

  try {
    const data = await fetch('/api/leagues/list').then(r => r.json());
    renderLeaguesList(data.leagues);
  } catch (err) { console.error(err); }
  finally { document.getElementById('leagues-loading').classList.add('hidden'); }
}

function renderLeaguesList(leagues) {
  const grid = document.getElementById('leagues-grid');
  grid.innerHTML = '';

  if (!leagues.length) { document.getElementById('leagues-empty').classList.remove('hidden'); return; }

  for (const league of leagues) {
    const card = document.createElement('div');
    card.className = 'league-card';
    card.innerHTML = `
      <div class="league-card-name">🏆 ${escapeHtml(league.name)}</div>
      <div class="league-card-meta">
        <span class="league-pill">👥 ${league.memberCount} membre${league.memberCount > 1 ? 's' : ''}</span>
        ${league.rank ? `<span class="league-pill rank">🏅 #${league.rank}</span>` : ''}
      </div>
      <div class="league-code-chip">🔑 ${escapeHtml(league.code)}</div>`;
    card.addEventListener('click', () => openLeague(league));
    grid.appendChild(card);
  }
}

function openLeague(league) {
  currentLeagueId = league.id;
  document.getElementById('league-detail-name').textContent = league.name;
  document.getElementById('league-detail-code').textContent = league.code;
  document.getElementById('leagues-list-view').classList.add('hidden');
  document.getElementById('league-detail-view').classList.remove('hidden');
  loadLeagueDetail(league.id);
}

function showLeaguesList() {
  document.getElementById('leagues-list-view').classList.remove('hidden');
  document.getElementById('league-detail-view').classList.add('hidden');
  currentLeagueId = null;
}

// ── League detail ─────────────────────────────────────────────────────────────
async function loadLeagueDetail(id) {
  document.getElementById('league-lb-loading').classList.remove('hidden');
  document.getElementById('league-lb-list').innerHTML = '';
  document.getElementById('league-lb-empty').classList.add('hidden');

  try {
    const data = await fetch(`/api/leagues/${id}?metric=${currentLeagueMetric}`).then(r => r.json());
    if (data.error) throw new Error(data.error);
    document.getElementById('league-week-label').textContent = weekRangeLabel(data.week_start);
    renderLeaderboard(data.leaderboard, currentLeagueMetric, 'league-lb-list', 'league-lb-empty');
  } catch (err) { console.error(err); }
  finally { document.getElementById('league-lb-loading').classList.add('hidden'); }
}

// Back button
document.getElementById('back-to-leagues').addEventListener('click', () => loadLeagues());

// Leave league
document.getElementById('leave-league-btn').addEventListener('click', async () => {
  if (!currentLeagueId) return;
  if (!confirm('Quitter cette ligue ?')) return;
  await fetch('/api/leagues/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId: currentLeagueId }),
  });
  loadLeagues();
});

// Copy code
document.getElementById('copy-code-btn').addEventListener('click', () => {
  const code = document.getElementById('league-detail-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-code-btn');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 1500);
  });
});

// ── Modals ────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.getElementById('open-create-modal').addEventListener('click', () => {
  document.getElementById('create-name-input').value = '';
  openModal('create-modal');
  setTimeout(() => document.getElementById('create-name-input').focus(), 50);
});

document.getElementById('open-join-modal').addEventListener('click', () => {
  document.getElementById('join-code-input').value = '';
  openModal('join-modal');
  setTimeout(() => document.getElementById('join-code-input').focus(), 50);
});

document.querySelectorAll('.modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => btn.closest('.modal').classList.add('hidden'));
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
});

// Create league
document.getElementById('create-submit-btn').addEventListener('click', async () => {
  const name = document.getElementById('create-name-input').value.trim();
  if (!name) return;
  const btn = document.getElementById('create-submit-btn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/leagues/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    closeModal('create-modal');
    await loadLeagues();
    openLeague({ ...data.league, memberCount: 1 });
  } catch (err) { alert('Erreur lors de la création.'); }
  finally { btn.disabled = false; }
});

document.getElementById('create-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('create-submit-btn').click();
});

// Join league
document.getElementById('join-submit-btn').addEventListener('click', async () => {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!code) return;
  const btn = document.getElementById('join-submit-btn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    closeModal('join-modal');
    await loadLeagues();
    openLeague(data.league);
  } catch (err) { alert('Erreur lors de la connexion.'); }
  finally { btn.disabled = false; }
});

document.getElementById('join-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('join-submit-btn').click();
});

init();
