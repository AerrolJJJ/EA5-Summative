/* Shared arcade helper: username prompt, Top 10 leaderboard, home + music buttons.
   Included as a plain script by every game page; talks to the Express/MongoDB API. */
(function () {
  // Vite (:5173) proxies /api; any other origin (Live Server :5500, file://) talks
  // to the Express server directly — it has CORS enabled.
  const API = location.port === '5173' ? '/api' : 'http://localhost:3000/api';
  const NAME_KEY = 'arcade_username';
  const MUTE_KEY = 'arcade_muted';

  let cfg = { game: null, title: 'Game', unit: '', decimals: 0, home: true, music: null };
  let panel, panelList, panelMsg, trophyBtn, userChip;

  const getName = () => localStorage.getItem(NAME_KEY) || '';
  const fmt = s => Number(s).toFixed(cfg.decimals);

  /* ---------- API calls (all fail silently so games work offline) ---------- */

  function fetchLeaderboard(game) {
    return fetch(`${API}/leaderboard/${game || cfg.game}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null);
  }

  function submitScore(score) {
    if (!getName()) return Promise.resolve(null);
    return fetch(`${API}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: cfg.game, username: getName(), score })
    }).catch(() => null);
  }

  function countPlay(game) {
    return fetch(`${API}/plays/${game}`, { method: 'POST' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null);
  }

  function fetchPlays() {
    return fetch(`${API}/plays`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null);
  }

  /* ---------- Leaderboard panel ---------- */

  function buildPanel() {
    trophyBtn = document.createElement('button');
    trophyBtn.className = 'arcade-trophy';
    trophyBtn.title = 'Top 10 leaderboard';
    trophyBtn.textContent = '🏆';
    trophyBtn.addEventListener('click', () => (panel.classList.contains('open') ? hidePanel() : showPanel()));
    document.body.appendChild(trophyBtn);

    panel = document.createElement('div');
    panel.className = 'arcade-panel';
    panel.innerHTML = `
      <div class="arcade-panel-head">🏆 TOP 10 — ${cfg.title}<button class="arcade-close" title="Close">×</button></div>
      <ol class="arcade-list"></ol>
      <div class="arcade-msg"></div>`;
    document.body.appendChild(panel);
    panelList = panel.querySelector('.arcade-list');
    panelMsg = panel.querySelector('.arcade-msg');
    panel.querySelector('.arcade-close').addEventListener('click', hidePanel);
  }

  function renderRows(rows, highlight) {
    if (rows === null) {
      panelList.innerHTML = '';
      panelMsg.textContent = 'Leaderboard offline — scores are not being saved.';
      return;
    }
    if (!rows.length) {
      panelList.innerHTML = '';
      panelMsg.textContent = 'No scores yet — be the first!';
      return;
    }
    panelMsg.textContent = '';
    panelList.innerHTML = rows
      .map((row, i) => {
        const hl = highlight && row.username === highlight.username && row.score === highlight.score;
        return `<li class="${hl ? 'arcade-me' : ''}">
          <span class="arcade-rank">${i + 1}</span>
          <span class="arcade-name">${row.username.replace(/[<>&]/g, '')}</span>
          <span class="arcade-score">${fmt(row.score)}${cfg.unit}</span>
        </li>`;
      })
      .join('');
  }

  function showPanel(opts) {
    opts = opts || {};
    if (opts.message !== undefined) panelMsg.textContent = opts.message;
    fetchLeaderboard().then(rows => {
      renderRows(rows, opts.highlight);
      if (opts.message && rows !== null) panelMsg.textContent = opts.message;
      panel.classList.add('open');
    });
  }

  function hidePanel() {
    panel.classList.remove('open');
  }

  /* ---------- Username overlay ---------- */

  function promptName(onDone) {
    const overlay = document.createElement('div');
    overlay.className = 'arcade-overlay';
    overlay.innerHTML = `
      <div class="arcade-modal">
        <h2>ENTER PLAYER NAME</h2>
        <input type="text" maxlength="16" placeholder="AAA" value="${getName().replace(/"/g, '')}">
        <button class="arcade-btn arcade-start">SAVE &amp; PLAY</button>
        <button class="arcade-btn arcade-skip">Play as guest (no saved scores)</button>
        <p class="arcade-hint">Your scores go to the ${cfg.title} Top 10</p>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('input');
    input.focus();

    const finish = name => {
      if (name) localStorage.setItem(NAME_KEY, name);
      else localStorage.removeItem(NAME_KEY);
      updateChip();
      overlay.remove();
      if (onDone) onDone(name);
    };
    overlay.querySelector('.arcade-start').addEventListener('click', () => {
      const name = input.value.trim().slice(0, 16);
      if (!name) { input.focus(); return; }
      finish(name);
    });
    overlay.querySelector('.arcade-skip').addEventListener('click', () => finish(''));
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') overlay.querySelector('.arcade-start').click();
    });
  }

  function updateChip() {
    userChip.textContent = '👤 ' + (getName() || 'Guest');
  }

  function buildChip() {
    userChip = document.createElement('button');
    userChip.className = 'arcade-user';
    userChip.title = 'Change player name';
    userChip.addEventListener('click', () => promptName());
    document.body.appendChild(userChip);
    updateChip();
  }

  /* ---------- Home + music buttons ---------- */

  function buildHome() {
    const home = document.createElement('a');
    home.className = 'arcade-home';
    home.href = new URL('../../../index.html', document.baseURI).href;
    home.title = 'Back to 4 The Game';
    home.textContent = '⌂ Home';
    document.body.appendChild(home);
  }

  function musicButton(audio, parent) {
    if (typeof audio === 'string') audio = document.querySelector(audio);
    if (!audio) return;
    const btn = document.createElement('button');
    btn.className = 'arcade-music';
    btn.title = 'Toggle music';
    const muted = localStorage.getItem(MUTE_KEY) === '1';
    audio.muted = muted;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0');
      btn.textContent = audio.muted ? '🔇' : '🔊';
      if (!audio.muted && audio.paused) audio.play().catch(() => {});
    });
    (parent || document.body).appendChild(btn);
    return btn;
  }

  /* ---------- Public API ---------- */

  function init(options) {
    Object.assign(cfg, options);
    // each game gets its own arcade palette (see [data-arcade-theme] blocks in arcade.css)
    document.documentElement.dataset.arcadeTheme = cfg.theme || cfg.game;
    buildPanel();
    buildChip();
    if (cfg.home) buildHome();
    if (cfg.music) musicButton(cfg.music);
    if (!getName()) promptName(() => showPanel());
    else showPanel();
  }

  // Call when a run ends: saves the score and reopens the Top 10 with it highlighted.
  function gameOver(score) {
    const name = getName();
    if (!name) {
      showPanel({ message: 'Playing as guest — score not saved.' });
      return;
    }
    const val = Number(fmt(score));
    submitScore(val).then(res => {
      if (res && res.ok) {
        showPanel({
          highlight: { username: name, score: val },
          message: `Saved: ${name} — ${fmt(val)}${cfg.unit}`
        });
      } else {
        showPanel({ message: 'Leaderboard offline — score not saved.' });
      }
    });
  }

  window.Arcade = { init, gameOver, showPanel, hidePanel, promptName, musicButton, countPlay, fetchPlays, fetchLeaderboard, getName };
})();
