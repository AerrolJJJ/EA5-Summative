/* Admin page: full CRUD over the scores + feedback collections */
const API = location.port === '5173' ? '/api' : 'http://localhost:3000/api';

const GAMES = {
  dino: 'Dino Game',
  carspeed: 'CarSpeed',
  puzzle: 'Sliding Puzzle',
  rps: 'Rock Paper Scissors',
  alien: 'Alien Survival',
  battle: 'Battle Arena'
};

let currentGame = 'dino';

const apiStatus = document.getElementById('apiStatus');
const tabsEl = document.getElementById('gameTabs');
const rowsEl = document.getElementById('scoreRows');
const playCountsEl = document.getElementById('playCounts');
const feedbackEl = document.getElementById('feedbackList');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = d => new Date(d).toLocaleString();

async function call(path, options) {
  const res = await fetch(API + path, options);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

/* ---------- scores ---------- */

function renderTabs() {
  tabsEl.innerHTML = Object.entries(GAMES)
    .map(([id, name]) => `<button class="tab ${id === currentGame ? 'active' : ''}" data-game="${id}">${name}</button>`)
    .join('');
  tabsEl.querySelectorAll('.tab').forEach(btn =>
    btn.addEventListener('click', () => {
      currentGame = btn.dataset.game;
      renderTabs();
      loadScores();
    })
  );
}

async function loadScores() {
  rowsEl.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  try {
    const rows = await call(`/scores?game=${currentGame}`);
    if (!rows.length) {
      rowsEl.innerHTML = '<tr><td colspan="5">No scores recorded for this game yet.</td></tr>';
      return;
    }
    rowsEl.innerHTML = rows
      .map((r, i) => `
        <tr data-id="${r.id}">
          <td>${i + 1}</td>
          <td class="cell-user">${esc(r.username)}</td>
          <td class="cell-score">${r.score}</td>
          <td>${fmtDate(r.createdAt)}</td>
          <td>
            <button class="edit" title="Edit">✏</button>
            <button class="del danger" title="Delete">🗑</button>
          </td>
        </tr>`)
      .join('');

    rowsEl.querySelectorAll('.edit').forEach(btn =>
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const curUser = tr.querySelector('.cell-user').textContent;
        const curScore = tr.querySelector('.cell-score').textContent;
        const username = prompt('Player name:', curUser);
        if (username === null) return;
        const score = prompt('Score:', curScore);
        if (score === null) return;
        try {
          await call(`/scores/${tr.dataset.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score: Number(score) })
          });
          loadScores();
        } catch (err) {
          alert('Update failed: ' + err.message);
        }
      })
    );

    rowsEl.querySelectorAll('.del').forEach(btn =>
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        if (!confirm(`Delete this score by "${tr.querySelector('.cell-user').textContent}"?`)) return;
        try {
          await call(`/scores/${tr.dataset.id}`, { method: 'DELETE' });
          loadScores();
        } catch (err) {
          alert('Delete failed: ' + err.message);
        }
      })
    );
  } catch (err) {
    rowsEl.innerHTML = `<tr><td colspan="5">Could not load scores: ${esc(err.message)}</td></tr>`;
  }
}

document.getElementById('clearBoard').addEventListener('click', async () => {
  if (!confirm(`Delete ALL scores for ${GAMES[currentGame]}? This cannot be undone.`)) return;
  try {
    const res = await call(`/scores?game=${currentGame}`, { method: 'DELETE' });
    alert(`Deleted ${res.deleted} score(s).`);
    loadScores();
  } catch (err) {
    alert('Clear failed: ' + err.message);
  }
});

/* ---------- play counts ---------- */

async function loadPlays() {
  try {
    const counts = await call('/plays');
    playCountsEl.innerHTML = Object.entries(GAMES)
      .map(([id, name]) => `<div class="count-chip"><b>${counts[id] ?? 0}</b> ${name}</div>`)
      .join('');
  } catch {
    playCountsEl.textContent = 'Could not load play counts.';
  }
}

/* ---------- feedback ---------- */

async function loadFeedback() {
  try {
    const rows = await call('/feedback');
    if (!rows.length) {
      feedbackEl.textContent = 'No feedback messages yet — the contact form on the home page saves here.';
      return;
    }
    feedbackEl.innerHTML = rows
      .map(r => `
        <article class="feedback-card" data-id="${r.id}">
          <div class="feedback-head">
            <b>${esc(r.name)}</b> &lt;${esc(r.email)}&gt;
            <span>${fmtDate(r.createdAt)}</span>
            <button class="del danger" title="Delete">🗑</button>
          </div>
          ${r.subject ? `<div class="feedback-subject">${esc(r.subject)}</div>` : ''}
          <p>${esc(r.message)}</p>
        </article>`)
      .join('');
    feedbackEl.querySelectorAll('.del').forEach(btn =>
      btn.addEventListener('click', async () => {
        const card = btn.closest('.feedback-card');
        if (!confirm('Delete this feedback message?')) return;
        try {
          await call(`/feedback/${card.dataset.id}`, { method: 'DELETE' });
          loadFeedback();
        } catch (err) {
          alert('Delete failed: ' + err.message);
        }
      })
    );
  } catch (err) {
    feedbackEl.textContent = 'Could not load feedback: ' + err.message;
  }
}

/* ---------- boot ---------- */

(async () => {
  renderTabs();
  try {
    await call('/plays');
    apiStatus.textContent = '● Connected to MongoDB (four_the_game)';
    apiStatus.classList.add('ok');
  } catch {
    apiStatus.textContent = '● API offline — start it with: npm run server';
    apiStatus.classList.add('bad');
  }
  loadScores();
  loadPlays();
  loadFeedback();
})();
