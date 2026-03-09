const RUNNING_TYPES = new Set(['Run', 'TrailRun']);

const SPORT_ICONS = {
  Run: '🏃', TrailRun: '🥾',
  default: '🏃',
};

function filterRunningData(data) {
  if (!data) return data;
  const result = { ...data };
  if (result.by_sport) {
    result.by_sport = Object.fromEntries(
      Object.entries(result.by_sport).filter(([type]) => RUNNING_TYPES.has(type))
    );
  }
  if (result.activities) {
    result.activities = result.activities.filter(a => RUNNING_TYPES.has(a.sport_type || a.type));
  }
  return result;
}
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
let currentIsAdmin = false;
let currentIsPremium = false;
let currentMetric = 'distance';
let currentLbWeek = 0;
let currentLeagueMetric = 'distance';
let currentLeagueWeek = 0;
let currentLeagueId = null;
let currentLeague = null;
let allChallenges = [];
let allChallengeCategories = [];

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

function getClientWeekStart(weeksBack = 0) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - weeksBack * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekRangeLabel(week_start) {
  const s = new Date(week_start);
  const end = new Date(s);
  end.setDate(end.getDate() + 6);
  const today = new Date();
  const e = end > today ? today : end;
  return `Semaine du ${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

function buildWeekSelector(containerId, activeWeek, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let w = 0; w <= 4; w++) {
    const btn = document.createElement('button');
    const locked = w > 1 && !currentIsPremium;
    btn.className = 'metric-btn' + (w === activeWeek ? ' active' : '') + (locked ? ' premium-locked' : '');
    if (w === 0) {
      btn.textContent = 'Cette sem.';
    } else {
      const d = getClientWeekStart(w);
      btn.textContent = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    btn.addEventListener('click', () => {
      if (locked) { openPremiumModal(); return; }
      onChange(w);
    });
    container.appendChild(btn);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('error')) alert('Connexion refusée ou erreur Strava.');
  history.replaceState({}, '', '/');

  const status = await fetch('/api/status').then(r => r.json());
  if (status.connected) {
    currentAthleteId = String(status.athlete.id);
    currentIsAdmin = !!status.isAdmin;
    currentIsPremium = !!status.isPremium;
    document.getElementById('athlete-badge').textContent = `${status.athlete.firstname} ${status.athlete.lastname}`;
    if (status.isAdmin) document.getElementById('admin-link').classList.remove('hidden');
    if (currentIsPremium) document.getElementById('premium-badge').classList.remove('hidden');
    updateElevationBtnLock();
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
    if (tab === 'history')     loadHistory();
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'leagues')     loadLeagues();
  });
});

// ── Premium helpers ────────────────────────────────────────────────────────────
function openPremiumModal() { openModal('premium-modal'); }

function updateElevationBtnLock() {
  document.querySelectorAll('.metric-btn[data-metric="elevation"]').forEach(btn => {
    btn.classList.toggle('premium-locked', !currentIsPremium);
  });
}

document.getElementById('premium-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('premium-modal')) closeModal('premium-modal');
});
document.querySelectorAll('#premium-modal .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => closeModal('premium-modal'));
});

// ── Global metric selectors ───────────────────────────────────────────────────
document.querySelectorAll('#lb-metric-btns .metric-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.metric === 'elevation' && !currentIsPremium) {
      openPremiumModal();
      return;
    }
    document.querySelectorAll('#lb-metric-btns .metric-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMetric = btn.dataset.metric;
    loadLeaderboard();
  });
});

document.querySelectorAll('#league-metric-btns .metric-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.metric === 'elevation' && !currentIsPremium) {
      openPremiumModal();
      return;
    }
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
    renderMyStats(filterRunningData(data));
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

// ── History ────────────────────────────────────────────────────────────────────
async function loadHistory() {
  const loading = document.getElementById('history-loading');
  const list    = document.getElementById('history-list');
  const empty   = document.getElementById('history-empty');
  list.innerHTML = '';
  empty.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const data = await fetch('/api/stats/history').then(r => r.json());
    if (data.error) throw new Error(data.error);

    const weeks = data.weeks.map(filterRunningData).filter(w => w.totals.count > 0);
    if (!weeks.length) { empty.classList.remove('hidden'); return; }
    const showUpsell = !data.isPremium;

    for (const week of weeks) {
      const start  = new Date(week.week_start);
      const end    = new Date(week.week_end);
      const label  = `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
      const sports = Object.entries(week.by_sport);

      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-week-label">${label}</div>
        <div class="history-stats">
          <div class="history-stat">
            <div class="history-stat-value">${week.totals.count}</div>
            <div class="history-stat-label">Activités</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${week.totals.distance > 0 ? fmtDistance(week.totals.distance) : '–'}</div>
            <div class="history-stat-label">Distance</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${week.totals.moving_time > 0 ? fmtTime(week.totals.moving_time) : '–'}</div>
            <div class="history-stat-label">Temps</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-value">${week.totals.elevation > 0 ? Math.round(week.totals.elevation) + ' m' : '–'}</div>
            <div class="history-stat-label">Dénivelé</div>
          </div>
        </div>
        <div class="history-sports">
          ${sports.map(([type, s]) => `
            <span class="history-sport-pill">
              ${sportIcon(type)} ${escapeHtml(type)}
              <span class="history-sport-detail">${s.count} sortie${s.count > 1 ? 's' : ''}${s.distance > 0 ? ' · ' + fmtDistance(s.distance) : ''}</span>
            </span>`).join('')}
        </div>`;
      list.appendChild(card);
    }

    if (showUpsell) {
      const upsell = document.createElement('div');
      upsell.innerHTML = `
        <div class="premium-upsell" style="margin-top:0.5rem">
          <div class="premium-upsell-icon">⭐</div>
          <div>
            <div class="premium-upsell-title">Historique complet — Premium</div>
            <div class="premium-upsell-desc">Accède aux 4 dernières semaines avec le Premium.
              <button class="btn-link-inline" onclick="openPremiumModal()">En savoir plus</button>
            </div>
          </div>
        </div>`;
      list.appendChild(upsell);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.classList.add('hidden');
  }
}

// ── Global leaderboard ────────────────────────────────────────────────────────
async function loadLeaderboard() {
  buildWeekSelector('lb-week-btns', currentLbWeek, (w) => {
    currentLbWeek = w;
    loadLeaderboard();
  });

  const loading = document.getElementById('lb-loading');
  document.getElementById('lb-list').innerHTML = '';
  document.getElementById('lb-empty').classList.add('hidden');
  loading.classList.remove('hidden');
  try {
    const res = await fetch(`/api/leaderboard?metric=${currentMetric}&week=${currentLbWeek}`);
    const data = await res.json();
    if (!res.ok) {
      if (data.premiumRequired) {
        renderPremiumUpsellBanner('lb-premium-upsell', true);
        document.getElementById('lb-list').innerHTML = '';
        document.getElementById('lb-empty').classList.add('hidden');
        return;
      }
      throw new Error(data.error);
    }
    renderPremiumUpsellBanner('lb-premium-upsell', false);
    document.getElementById('lb-week-label').textContent = weekRangeLabel(data.week_start);
    renderLeaderboard(data.leaderboard.map(filterRunningData), currentMetric, 'lb-list', 'lb-empty');
  } catch (err) { console.error(err); }
  finally { loading.classList.add('hidden'); }
}

function renderLeaderboard(leaderboard, metric, listId, emptyId) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.innerHTML = '';

  if (leaderboard.length === 0) { empty.classList.remove('hidden'); return; }

  leaderboard.forEach((entry, i) => {
    const isMe = entry.athlete.id === currentAthleteId;
    const sports = Object.keys(entry.by_sport);

    const item = document.createElement('div');
    item.className = `lb-item rank-${i + 1}`;
    item.innerHTML = `
      <div class="lb-rank">${MEDALS[i] || i + 1}</div>
      <div class="lb-avatar">${entry.athlete.profile_medium ? `<img src="${escapeHtml(entry.athlete.profile_medium)}" alt="" />` : '👤'}</div>
      <div class="lb-info" style="flex:1">
        <div class="lb-name ${isMe ? 'is-me' : ''}">${escapeHtml(entry.athlete.firstname)} ${escapeHtml(entry.athlete.lastname)}</div>
        ${entry.athlete.city ? `<div class="lb-city">📍 ${escapeHtml(entry.athlete.city)}</div>` : ''}
        <div class="lb-sports">${sports.map(s => `<span class="lb-sport-tag">${sportIcon(s)} ${escapeHtml(s)}</span>`).join('')}</div>
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
  currentLeague = league;
  document.getElementById('league-detail-name').textContent = league.name;
  document.getElementById('league-detail-code').textContent = league.code;
  document.getElementById('leagues-list-view').classList.add('hidden');
  document.getElementById('league-detail-view').classList.remove('hidden');

  // Show management buttons to creator or admin
  const isManager = String(league.createdBy) === String(currentAthleteId) || currentIsAdmin;
  document.getElementById('challenge-btn').classList.toggle('hidden', !isManager);
  document.getElementById('rename-league-btn').classList.toggle('hidden', !isManager);

  loadLeagueDetail(league.id);
}

function showLeaguesList() {
  document.getElementById('leagues-list-view').classList.remove('hidden');
  document.getElementById('league-detail-view').classList.add('hidden');
  currentLeagueId = null;
  currentLeague = null;
  currentLeagueWeek = 0;
}

// ── League detail ─────────────────────────────────────────────────────────────
async function loadLeagueDetail(id) {
  buildWeekSelector('league-week-btns', currentLeagueWeek, (w) => {
    currentLeagueWeek = w;
    // Hide challenge button on historical weeks
    const isManager = currentLeague && (String(currentLeague.createdBy) === String(currentAthleteId) || currentIsAdmin);
    document.getElementById('challenge-btn').classList.toggle('hidden', !isManager || w > 0);
    document.getElementById('rename-league-btn').classList.toggle('hidden', !isManager);
    loadLeagueDetail(id);
  });

  document.getElementById('league-lb-loading').classList.remove('hidden');
  document.getElementById('league-lb-list').innerHTML = '';
  document.getElementById('league-lb-empty').classList.add('hidden');

  try {
    const data = await fetch(`/api/leagues/${id}?metric=${currentLeagueMetric}&week=${currentLeagueWeek}`).then(r => r.json());
    if (data.error) throw new Error(data.error);
    if (data.league) currentLeague = { ...currentLeague, ...data.league };
    document.getElementById('league-week-label').textContent = weekRangeLabel(data.week_start);
    renderChallengeBanner(currentLeagueWeek === 0 ? data.challenge : null);
    // If elevation/week was requested but fell back due to premium gate
    const effectiveMetric = (currentLeagueMetric === 'elevation' && data.premiumRequired) ? 'distance' : currentLeagueMetric;
    const effectiveWeek = (currentLeagueWeek > 0 && data.premiumRequired) ? 0 : currentLeagueWeek;
    renderPremiumUpsellBanner('league-premium-upsell', !!data.premiumRequired);
    renderLeagueLeaderboard(data.leaderboard.map(filterRunningData), effectiveMetric, effectiveWeek === 0 ? data.challenge : null);
  } catch (err) { console.error(err); }
  finally { document.getElementById('league-lb-loading').classList.add('hidden'); }
}

function renderPremiumUpsellBanner(containerId, show) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!show) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="premium-upsell">
      <div class="premium-upsell-icon">⭐</div>
      <div>
        <div class="premium-upsell-title">Fonctionnalité Premium</div>
        <div class="premium-upsell-desc">Cette option est réservée aux membres Premium (semaines passées, classement D+). <button class="btn-link-inline" onclick="openPremiumModal()">En savoir plus</button></div>
      </div>
    </div>`;
}

function renderChallengeBanner(challenge) {
  const banner = document.getElementById('challenge-banner');
  if (!challenge) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }
  banner.classList.remove('hidden');
  banner.innerHTML = `
    <div class="challenge-banner">
      <div class="challenge-banner-icon">${escapeHtml(challenge.emoji)}</div>
      <div class="challenge-banner-info">
        <div class="challenge-banner-label">Défi en cours</div>
        <div class="challenge-banner-name">${escapeHtml(challenge.label)}</div>
        <div class="challenge-banner-desc">${escapeHtml(challenge.desc)}</div>
      </div>
    </div>`;
}

function renderLeagueLeaderboard(leaderboard, metric, challenge) {
  const list = document.getElementById('league-lb-list');
  const empty = document.getElementById('league-lb-empty');
  list.innerHTML = '';

  if (!leaderboard.length) { empty.classList.remove('hidden'); return; }

  const isManager = currentLeague && (String(currentLeague.createdBy) === String(currentAthleteId) || currentIsAdmin);
  const creatorId = currentLeague ? String(currentLeague.createdBy) : null;

  leaderboard.forEach((entry, i) => {
    const isMe = entry.athlete.id === currentAthleteId;
    const sports = Object.keys(entry.by_sport);
    const canKick = isManager && !isMe && (currentIsAdmin || entry.athlete.id !== creatorId);

    const item = document.createElement('div');
    item.className = `lb-item rank-${i + 1}`;

    let challengeHtml = '';
    if (challenge && entry.progress !== undefined) {
      const { pct, completed } = entry.progress;
      challengeHtml = `
        <div class="challenge-progress">
          <div class="challenge-progress-bar-track">
            <div class="challenge-progress-bar-fill ${completed ? 'completed' : ''}" style="width:${pct}%"></div>
          </div>
          <span class="challenge-progress-label">${completed ? '✅' : `${pct}%`}</span>
        </div>`;
    }

    item.innerHTML = `
      <div class="lb-rank">${MEDALS[i] || i + 1}</div>
      <div class="lb-avatar">${entry.athlete.profile_medium ? `<img src="${escapeHtml(entry.athlete.profile_medium)}" alt="" />` : '👤'}</div>
      <div class="lb-info" style="flex:1">
        <div class="lb-name ${isMe ? 'is-me' : ''}">${escapeHtml(entry.athlete.firstname)} ${escapeHtml(entry.athlete.lastname)}</div>
        ${entry.athlete.city ? `<div class="lb-city">📍 ${escapeHtml(entry.athlete.city)}</div>` : ''}
        <div class="lb-sports">${sports.map(s => `<span class="lb-sport-tag">${sportIcon(s)} ${escapeHtml(s)}</span>`).join('')}</div>
        ${challengeHtml}
      </div>
      <div class="lb-secondary">
        <span class="lb-sec-item">${entry.totals.count} activité${entry.totals.count > 1 ? 's' : ''}</span>
        ${entry.totals.distance > 0 ? `<span class="lb-sec-item"><strong>${fmtDistance(entry.totals.distance)}</strong></span>` : ''}
        <span class="lb-sec-item"><strong>${fmtTime(entry.totals.moving_time)}</strong></span>
      </div>
      <div class="lb-metric">
        <div class="lb-metric-value">${metricValue(entry.totals, metric)}</div>
        <div class="lb-metric-label">${metricLabel(metric)}</div>
      </div>
      ${canKick ? `<button class="btn-kick" data-member-id="${escapeHtml(entry.athlete.id)}" title="Exclure ce membre">✕</button>` : ''}`;

    if (canKick) {
      item.querySelector('.btn-kick').addEventListener('click', () => kickMember(entry.athlete.id, `${entry.athlete.firstname} ${entry.athlete.lastname}`));
    }
    list.appendChild(item);
  });
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

// ── Challenge modal ───────────────────────────────────────────────────────────
document.getElementById('challenge-btn').addEventListener('click', async () => {
  // Load challenges list if not already loaded
  if (!allChallenges.length) {
    const data = await fetch('/api/leagues/challenges').then(r => r.json());
    allChallenges = data.challenges || [];
    allChallengeCategories = data.categories || [];
    // Update isPremium from response (fresh check)
    if (typeof data.isPremium === 'boolean') currentIsPremium = data.isPremium;
  }
  renderChallengeModal();
  openModal('challenge-modal');
});

document.querySelectorAll('#challenge-modal .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => closeModal('challenge-modal'));
});

document.getElementById('challenge-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('challenge-modal')) closeModal('challenge-modal');
});

document.getElementById('stop-challenge-btn').addEventListener('click', async () => {
  if (!confirm('Arrêter le défi en cours ?')) return;
  await setChallenge(null);
  closeModal('challenge-modal');
});

function renderChallengeModal() {
  const hasActiveChallenge = document.getElementById('challenge-banner').innerHTML !== '';
  const stopBtn = document.getElementById('stop-challenge-btn');
  stopBtn.classList.toggle('hidden', !hasActiveChallenge);

  const list = document.getElementById('challenge-list');
  list.innerHTML = '';

  for (const cat of allChallengeCategories) {
    const catEl = document.createElement('div');
    catEl.className = 'challenge-category';
    catEl.innerHTML = `<div class="challenge-category-title">${cat.emoji} ${escapeHtml(cat.label)}</div>`;

    const grid = document.createElement('div');
    grid.className = 'challenge-grid';

    for (const id of cat.ids) {
      const c = allChallenges.find(ch => ch.id === id);
      if (!c) continue;
      const isLocked = !!c.premium && !currentIsPremium;
      const card = document.createElement('button');
      card.className = 'challenge-card' + (isLocked ? ' premium-locked' : '');
      card.innerHTML = `
        <div class="challenge-card-emoji">${escapeHtml(c.emoji)}</div>
        <div class="challenge-card-label">${escapeHtml(c.label)}</div>
        <div class="challenge-card-desc">${escapeHtml(c.desc)}</div>`;
      card.addEventListener('click', async () => {
        if (isLocked) { openPremiumModal(); return; }
        await setChallenge(c.id);
        closeModal('challenge-modal');
      });
      grid.appendChild(card);
    }

    catEl.appendChild(grid);
    list.appendChild(catEl);
  }
}

async function setChallenge(challengeId) {
  if (!currentLeagueId) return;
  try {
    const res = await fetch('/api/leagues/set-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: currentLeagueId, challengeId }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    loadLeagueDetail(currentLeagueId);
  } catch (err) { alert('Erreur lors de la mise à jour du défi.'); }
}

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
    if (data.error) {
      closeModal('create-modal');
      if (data.premiumRequired) { openPremiumModal(); return; }
      alert(data.error);
      return;
    }
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

// ── Rename league ─────────────────────────────────────────────────────────────
document.getElementById('rename-league-btn').addEventListener('click', () => {
  document.getElementById('rename-input').value = currentLeague?.name ?? '';
  openModal('rename-modal');
  setTimeout(() => document.getElementById('rename-input').focus(), 50);
});

document.getElementById('rename-submit-btn').addEventListener('click', async () => {
  const name = document.getElementById('rename-input').value.trim();
  if (!name || !currentLeagueId) return;
  const btn = document.getElementById('rename-submit-btn');
  btn.disabled = true;
  try {
    const res = await fetch('/api/leagues/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: currentLeagueId, name }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    currentLeague = { ...currentLeague, name: data.league.name };
    document.getElementById('league-detail-name').textContent = data.league.name;
    closeModal('rename-modal');
  } catch { alert('Erreur lors du renommage.'); }
  finally { btn.disabled = false; }
});

document.getElementById('rename-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('rename-submit-btn').click();
});

document.querySelectorAll('#rename-modal .modal-cancel').forEach(btn => {
  btn.addEventListener('click', () => closeModal('rename-modal'));
});

document.getElementById('rename-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('rename-modal')) closeModal('rename-modal');
});

// ── Kick member ───────────────────────────────────────────────────────────────
async function kickMember(memberId, memberName) {
  if (!confirm(`Exclure ${memberName} de la ligue ?`)) return;
  try {
    const res = await fetch('/api/leagues/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: currentLeagueId, memberId }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    loadLeagueDetail(currentLeagueId);
  } catch { alert('Erreur lors de l\'exclusion.'); }
}

// Expose for inline onclick usage
window.openPremiumModal = openPremiumModal;

init();
