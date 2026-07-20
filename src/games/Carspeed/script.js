/*AUTHOR: Aerrol John Jimenez — refactored & fixed*/
const score = document.querySelector('.score');
const startScreen = document.querySelector('.startScreen');
const gameArea = document.querySelector('.gameArea');
const bgMusic = document.querySelector('.bgmusic');

startScreen.addEventListener('click', start);
const player = { speed: 6, score: 0, start: false, x: 0, y: 0 };
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const enemyColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
let lastTime = 0;
let graceUntil = 0;   // no collisions right after spawn
let lockUntil = 0;    // ignore restart clicks right after a crash

document.addEventListener('keydown', e => {
  if (e.key in keys) {
    e.preventDefault();
    keys[e.key] = true;
  }
});
document.addEventListener('keyup', e => {
  if (e.key in keys) keys[e.key] = false;
});

// Touch steering: the car follows your finger, clamped to the road
gameArea.addEventListener('touchmove', e => {
  if (!player.start) return;
  e.preventDefault();
  const t = e.touches[0];
  const road = gameArea.getBoundingClientRect();
  player.x = Math.min(Math.max(t.clientX - road.left - 25, 0), road.width - 50);
  player.y = Math.min(Math.max(t.clientY - road.top - 40, 70), road.height - 85);
}, { passive: false });

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const points = () => Math.floor(player.score / 2);

// Slightly inset hitboxes so transparent sprite corners don't count as a crash
const isCollide = (a, b) => {
  const p = 8;
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  return !(
    aRect.bottom - p < bRect.top + p ||
    aRect.top + p > bRect.bottom - p ||
    aRect.right - p < bRect.left + p ||
    aRect.left + p > bRect.right - p
  );
};

function moveLines(step) {
    document.querySelectorAll('.lines').forEach(item => {
        if (item.y >= 650) item.y -= 740;
        item.y += step;
        item.style.top = item.y + 'px';
    });
}

function endGame() {
    player.start = false;
    lockUntil = Date.now() + 700;
    bgMusic.pause();
    startScreen.classList.remove('hide');
    startScreen.innerHTML = `
        <h1>Game Over</h1>
        <p>Final Score: <strong>${points()}</strong></p>
        <p>Tap or click to restart</p>
    `;
    if (window.Arcade) Arcade.gameOver(points());
}

const overlaps = (a, b, gap) =>
    Math.abs(a.y - b.y) < 100 + gap &&
    Math.abs(a.offsetLeft - b.offsetLeft) < 50 + gap;

function clearOfOthers(enemyCar) {
    const others = [...document.querySelectorAll('.enemy')].filter(e => e !== enemyCar);
    return others.every(other => !overlaps(enemyCar, other, 20));
}

function spawnEnemy(index) {
    const road = gameArea.getBoundingClientRect();
    const enemyCar = document.createElement('div');
    enemyCar.className = 'enemy';
    enemyCar.y = -100 - index * 350;
    enemyCar.style.top = enemyCar.y + 'px';
    enemyCar.style.boxShadow = `0 0 8px 2px ${enemyColors[index % enemyColors.length]}`;
    gameArea.appendChild(enemyCar);
    // pick an x that doesn't overlap another enemy
    for (let tries = 0; tries < 8; tries++) {
        enemyCar.style.left = Math.floor(Math.random() * (road.width - enemyCar.offsetWidth)) + 'px';
        if (clearOfOthers(enemyCar)) break;
    }
}

// Traffic gets denser as the score climbs
function ensureEnemies() {
    const wanted = points() >= 1200 ? 5 : points() >= 500 ? 4 : 3;
    const existing = document.querySelectorAll('.enemy').length;
    for (let i = existing; i < wanted; i++) spawnEnemy(i);
}

function moveEnemy(car, step) {
    const road = gameArea.getBoundingClientRect();
    const enemies = [...document.querySelectorAll('.enemy')];
    const inGrace = performance.now() < graceUntil;

    enemies.forEach(item => {
        if (!inGrace && isCollide(car, item)) {
            endGame();
        }
        item.y += step;
        item.style.top = item.y + 'px';

        if (item.y > road.height) {
            for (let tries = 0; tries < 8; tries++) {
                item.y = -100 - Math.floor(Math.random() * 180);
                item.style.left = Math.floor(Math.random() * (road.width - item.offsetWidth)) + 'px';
                if (clearOfOthers(item)) break;
            }
            item.style.top = item.y + 'px';
        }
    });

    // keep traffic from stacking: push the upper car further up until clear
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const a = enemies[i], b = enemies[j];
            if (overlaps(a, b, 10)) {
                const upper = a.y < b.y ? a : b;
                upper.y -= 120;
                upper.style.top = upper.y + 'px';
            }
        }
    }
}

function gamePlay(timestamp) {
    const car = document.querySelector('.car');
    if (!car) return;
    const road = gameArea.getBoundingClientRect();

    if (player.start) {
        // Delta-time so the game runs the same on 60Hz and 144Hz screens
        const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.05);
        lastTime = timestamp;

        // Speed ramps from 6 up to 13 as the score grows
        player.speed = Math.min(13, 6 + points() / 400);
        const step = player.speed * dt * 60;

        ensureEnemies();
        moveLines(step);
        moveEnemy(car, step);
        if (!player.start) return;

        if (keys.ArrowUp) player.y -= step;
        if (keys.ArrowDown) player.y += step;
        if (keys.ArrowLeft) player.x -= step;
        if (keys.ArrowRight) player.x += step;
        player.x = clamp(player.x, 0, road.width - 50);
        player.y = clamp(player.y, 70, road.height - 85);

        car.style.top = player.y + 'px';
        car.style.left = player.x + 'px';

        player.score += dt * 120;
        score.innerText = 'Score: ' + points();

        window.requestAnimationFrame(gamePlay);
    }
}

function start() {
    if (player.start || Date.now() < lockUntil) return;
    startScreen.classList.add('hide');
    gameArea.innerHTML = '';
    player.start = true;
    player.score = 0;
    player.speed = 6;
    lastTime = 0;
    graceUntil = performance.now() + 1000;
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    window.requestAnimationFrame(gamePlay);

    // Road lines
    for (let i = 0; i < 5; i++) {
        const roadLine = document.createElement('div');
        roadLine.className = 'lines';
        roadLine.y = i * 150;
        roadLine.style.top = roadLine.y + 'px';
        gameArea.appendChild(roadLine);
    }

    // Player car — starts centered near the bottom with 1s of spawn protection
    const car = document.createElement('div');
    car.className = 'car grace';
    gameArea.appendChild(car);
    player.x = Math.floor((gameArea.clientWidth - car.offsetWidth) / 2);
    player.y = car.offsetTop;
    car.style.left = player.x + 'px';
    setTimeout(() => car.classList.remove('grace'), 1000);

    // Enemy cars — use CSS background image (car.png)
    for (let i = 0; i < 3; i++) spawnEnemy(i);
}
