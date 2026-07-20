const header = document.querySelector("header");
const menu = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  header.classList.toggle('sticky', window.scrollY > 0);
  menu.classList.remove('bx-x');
  navbar.classList.remove('active');
});

menu.addEventListener('click', () => {
  menu.classList.toggle('bx-x');
  navbar.classList.toggle('active');
});

const sr = ScrollReveal({ distance: '25px', duration: 2500, reset: true });
sr.reveal('.home-text, .about, .favorites, .projects, .contact', { delay: 200, origin: 'bottom' });

/* ---------- Background music toggle (autoplay is blocked by browsers) ---------- */

const music = document.querySelector('#bgMusic');
const musicToggle = document.querySelector('#musicToggle');

musicToggle.addEventListener('click', () => {
  if (music.paused) {
    music.play().catch(() => {});
    musicToggle.textContent = '🔊';
    localStorage.setItem('arcade_muted', '0');
  } else {
    music.pause();
    musicToggle.textContent = '🔇';
    localStorage.setItem('arcade_muted', '1');
  }
});

/* ---------- Play counters (fails silently if the API/MongoDB is offline) ---------- */

// Vite (:5173) proxies /api; any other origin (Live Server :5500) hits the API directly
const API = location.port === '5173' ? '/api' : 'http://localhost:3000/api';

const renderCount = (id, count) => {
  const badge = document.querySelector(`.play-count[data-game="${id}"]`);
  if (badge) badge.textContent = `👤 ${count} ${count === 1 ? 'play' : 'plays'}`;
};

fetch(`${API}/plays`)
  .then(r => (r.ok ? r.json() : Promise.reject()))
  .then(counts => Object.keys(counts).forEach(id => renderCount(id, counts[id])))
  .catch(() => {});

document.querySelectorAll('a.btn[data-game]').forEach(link => {
  link.addEventListener('click', () => {
    fetch(`${API}/plays/${link.dataset.game}`, { method: 'POST' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(res => renderCount(res.game, res.count))
      .catch(() => {});
  });
});

/* ---------- contact form → feedback collection in MongoDB ---------- */

const contactForm = document.querySelector('#contactForm');
const contactStatus = document.querySelector('#contactStatus');

contactForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(contactForm));
  contactStatus.textContent = 'Sending…';
  fetch(`${API}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(() => {
      contactForm.reset();
      contactStatus.textContent = '✅ Thanks! Your message was saved.';
    })
    .catch(() => {
      contactStatus.textContent = '⚠ Could not send — the server is offline.';
    });
});

