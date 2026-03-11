function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const status = await fetch('/api/status').then(r => r.json());

  document.getElementById('page-loading').classList.add('hidden');

  if (!status.connected || !status.isAdmin) {
    document.getElementById('forbidden').classList.remove('hidden');
    return;
  }

  document.getElementById('admin-app').classList.remove('hidden');
  loadStats();
  loadUsers();
  loadFeedbacks();
  loadLeagues();
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
});

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await fetch('/api/admin/stats').then(r => r.json());
    document.getElementById('stat-users').textContent = data.totalUsers ?? '–';
    document.getElementById('stat-active').textContent = data.activeThisWeek ?? '–';
    document.getElementById('stat-leagues').textContent = data.totalLeagues ?? '–';
    document.getElementById('stat-premium').textContent = data.premiumUsers ?? '–';
    document.getElementById('stat-banned').textContent = data.bannedUsers ?? '–';
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  document.getElementById('users-loading').classList.remove('hidden');
  document.getElementById('users-table-wrap').classList.add('hidden');
  document.getElementById('users-empty').classList.add('hidden');

  try {
    const data = await fetch('/api/admin/users').then(r => r.json());
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';

    if (!data.users?.length) {
      document.getElementById('users-empty').classList.remove('hidden');
      return;
    }

    for (const user of data.users) {
      const tr = document.createElement('tr');
      tr.dataset.id = user.id;

      const bannedBadge = user.isBanned ? `<span class="badge-banned">banni</span>` : '';
      const premiumBadge = user.isPremium ? `<span class="badge-premium">⭐ Premium</span>` : '';
      const avatarHtml = user.profile_medium
        ? `<img class="admin-avatar" src="${escapeHtml(user.profile_medium)}" alt="" />`
        : `<div class="admin-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1rem">👤</div>`;

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            ${avatarHtml}
            <span>${escapeHtml(user.firstname)} ${escapeHtml(user.lastname)}${bannedBadge}</span>
          </div>
        </td>
        <td class="muted">${escapeHtml(user.city ?? '–')}</td>
        <td>${premiumBadge}</td>
        <td>
          <div class="action-cell">
            <button class="btn-ok btn-premium-toggle" title="${user.isPremium ? 'Révoquer Premium' : 'Activer Premium'}">
              ${user.isPremium ? '⭐ Révoquer' : '⭐ Activer'}
            </button>
            <button class="btn-warn btn-ban-toggle" title="${user.isBanned ? 'Débannir' : 'Bannir'}">
              ${user.isBanned ? 'Débannir' : 'Bannir'}
            </button>
            <button class="btn-danger btn-delete-user" title="Supprimer le compte">
              Supprimer
            </button>
          </div>
        </td>`;

      tr.querySelector('.btn-premium-toggle').addEventListener('click', () => togglePremium(user.id, !user.isPremium, `${user.firstname} ${user.lastname}`));
      tr.querySelector('.btn-ban-toggle').addEventListener('click', () => toggleBan(user.id, !user.isBanned, tr));
      tr.querySelector('.btn-delete-user').addEventListener('click', () => deleteUser(user.id, `${user.firstname} ${user.lastname}`));

      tbody.appendChild(tr);
    }

    document.getElementById('users-table-wrap').classList.remove('hidden');
  } catch (err) {
    console.error('Users error:', err);
  } finally {
    document.getElementById('users-loading').classList.add('hidden');
  }
}

async function togglePremium(athleteId, activate, name) {
  const action = activate ? 'activer' : 'révoquer';
  if (!confirm(`${activate ? 'Activer' : 'Révoquer'} le Premium pour ${name} ?`)) return;

  const res = await fetch('/api/admin/premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, active: activate }),
  });

  if (res.ok) {
    await loadUsers();
    await loadStats();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur');
  }
}

async function toggleBan(athleteId, ban, row) {
  const action = ban ? 'ban' : 'unban';
  const label = ban ? 'Bannir' : 'Débannir';
  if (!confirm(`${label} cet athlète ?`)) return;

  const res = await fetch('/api/admin/ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId, action }),
  });

  if (res.ok) {
    // Refresh the row state
    await loadUsers();
    await loadStats();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur');
  }
}

async function deleteUser(athleteId, name) {
  if (!confirm(`Supprimer définitivement le compte de ${name} ? Cette action est irréversible.`)) return;

  const res = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });

  if (res.ok) {
    await loadUsers();
    await loadLeagues();
    await loadStats();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur');
  }
}

// ── Feedbacks ─────────────────────────────────────────────────────────────────
async function loadFeedbacks() {
  const loading = document.getElementById('feedbacks-loading');
  const empty   = document.getElementById('feedbacks-empty');
  const wrap    = document.getElementById('feedbacks-table-wrap');
  const summary = document.getElementById('feedbacks-summary');
  loading.classList.remove('hidden');
  wrap.classList.add('hidden');
  empty.classList.add('hidden');
  summary.classList.add('hidden');

  try {
    const data = await fetch('/api/admin/feedbacks').then(r => r.json());

    // Update summary stat card
    document.getElementById('stat-feedback').textContent =
      data.avgRating ? `${data.avgRating} ★` : '–';

    if (!data.feedbacks?.length) {
      empty.classList.remove('hidden');
      return;
    }

    // Mini summary
    const counts = [0, 0, 0, 0, 0];
    data.feedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) counts[f.rating - 1]++; });
    summary.innerHTML = [5,4,3,2,1].map(n => `
      <span style="font-size:0.85rem;color:var(--muted)">
        ${'⭐'.repeat(n)} <strong style="color:var(--text)">${counts[n-1]}</strong>
      </span>`).join('');
    summary.classList.remove('hidden');

    const tbody = document.getElementById('feedbacks-tbody');
    tbody.innerHTML = '';
    for (const f of data.feedbacks) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="muted">${fmtDate(f.createdAt)}</td>
        <td class="muted" style="font-family:monospace;font-size:0.8rem">${escapeHtml(f.athleteId)}</td>
        <td style="font-weight:700;color:var(--gold)">${'⭐'.repeat(f.rating)}</td>
        <td style="max-width:320px;white-space:pre-wrap;word-break:break-word">${f.comment ? escapeHtml(f.comment) : '<span style="color:var(--muted)">–</span>'}</td>`;
      tbody.appendChild(tr);
    }
    wrap.classList.remove('hidden');
  } catch (err) {
    console.error('Feedbacks error:', err);
  } finally {
    loading.classList.add('hidden');
  }
}

document.getElementById('clear-feedbacks-btn').addEventListener('click', async () => {
  if (!confirm('Effacer tous les retours utilisateurs ?')) return;
  await fetch('/api/admin/feedbacks', { method: 'DELETE' });
  loadFeedbacks();
});

// ── Leagues ───────────────────────────────────────────────────────────────────
async function loadLeagues() {
  document.getElementById('leagues-loading').classList.remove('hidden');
  document.getElementById('leagues-table-wrap').classList.add('hidden');
  document.getElementById('leagues-empty').classList.add('hidden');

  try {
    const data = await fetch('/api/admin/leagues').then(r => r.json());
    const tbody = document.getElementById('leagues-tbody');
    tbody.innerHTML = '';

    if (!data.leagues?.length) {
      document.getElementById('leagues-empty').classList.remove('hidden');
      return;
    }

    for (const league of data.leagues) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600">${escapeHtml(league.name)}</td>
        <td><span style="font-family:monospace;color:var(--orange);letter-spacing:2px">${escapeHtml(league.code)}</span></td>
        <td class="muted">${league.memberCount}</td>
        <td class="muted">${fmtDate(league.createdAt)}</td>
        <td>
          <button class="btn-danger btn-delete-league">Supprimer</button>
        </td>`;

      tr.querySelector('.btn-delete-league').addEventListener('click', () => deleteLeague(league.id, league.name));
      tbody.appendChild(tr);
    }

    document.getElementById('leagues-table-wrap').classList.remove('hidden');
  } catch (err) {
    console.error('Leagues error:', err);
  } finally {
    document.getElementById('leagues-loading').classList.add('hidden');
  }
}

async function deleteLeague(leagueId, name) {
  if (!confirm(`Supprimer définitivement la ligue "${name}" ? Tous les membres en seront exclus.`)) return;

  const res = await fetch('/api/admin/leagues', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId }),
  });

  if (res.ok) {
    await loadLeagues();
    await loadStats();
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur');
  }
}

// ── Backfill badges ───────────────────────────────────────────────────────────
document.getElementById('backfill-badges-btn').addEventListener('click', async () => {
  if (!confirm('Attribuer les badges rétroactivement pour tous les athlètes sur les 4 dernières semaines ?\nCela peut prendre quelques secondes.')) return;

  const btn    = document.getElementById('backfill-badges-btn');
  const status = document.getElementById('backfill-badges-status');
  btn.disabled = true;
  status.textContent = 'En cours...';

  try {
    const res  = await fetch('/api/admin/backfill-badges', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      status.textContent = `Terminé — ${data.athletes} athlètes, ${data.leagues} ligues traités (${data.errors} erreurs).`;
    } else {
      status.textContent = data.error || 'Erreur';
    }
  } catch (err) {
    status.textContent = 'Erreur réseau';
  } finally {
    btn.disabled = false;
  }
});

init();
