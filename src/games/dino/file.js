const container = document.querySelector('#container');
const dino = document.querySelector('#dino');
const block = document.querySelector('#block');
const road = document.querySelector('#road');
const cloud = document.querySelector('#cloud');
const score = document.querySelector('#score');
const startScreen = document.querySelector('#startScreen');
const gameOver = document.querySelector('#gameOver');
let interval;
let playerScore = 0;
let best = Number(localStorage.getItem('dino_best')) || 0;
let isPlaying = false;
let lockUntil = 0; // brief pause after game over so a buffered click/space can't skip the score screen

const renderScore = () => {
  score.innerHTML = `Best <b>${best}</b> &nbsp;|&nbsp; Score <b>${playerScore}</b>`;
};

const updateScore = () => {
  playerScore++;
  renderScore();
};

const setAnimation = (element, value) => {
  element.firstElementChild.style.animation = value;
};

// 0 → 1 over the first ~300 points; drives obstacle and road speed
const difficulty = () => Math.min(1, playerScore / 300);

// Each obstacle pass gets its own speed and a random gap, so the rhythm
// is never metronomic and the game gets harder the longer you survive.
const nextBlockRun = () => {
  if (!isPlaying) return;
  const dur = 1.5 - difficulty() * 0.75 + Math.random() * 0.3;
  const delay = 0.15 + Math.random() * 0.9;
  block.style.animation = 'none';
  void block.offsetWidth;
  block.style.animation = `blockAnimate ${dur.toFixed(2)}s linear ${delay.toFixed(2)}s`;
  setAnimation(road, `roadAnimate ${(1.5 - difficulty() * 0.7).toFixed(2)}s linear infinite`);
};
block.addEventListener('animationend', nextBlockRun);

const jump = () => {
  if (!isPlaying || dino.classList.contains('dinoActive')) return;
  dino.classList.add('dinoActive');
  setTimeout(() => dino.classList.remove('dinoActive'), 500);
};

const startGame = () => {
  if (isPlaying || Date.now() < lockUntil) return;
  isPlaying = true;
  startScreen.style.display = 'none';
  gameOver.style.display = 'none';
  setAnimation(cloud, 'cloudAnimate 50s linear infinite');
  playerScore = 0;
  renderScore();
  clearInterval(interval);
  interval = setInterval(updateScore, 200);
  nextBlockRun();
};

const stopGame = () => {
  isPlaying = false;
  lockUntil = Date.now() + 700;
  block.style.animation = 'none';
  setAnimation(road, 'none');
  setAnimation(cloud, 'none');
  clearInterval(interval);
  if (playerScore > best) {
    best = playerScore;
    localStorage.setItem('dino_best', best);
  }
  renderScore();
  gameOver.innerHTML = `
    Game Over<br>
    <span style="font-size:1.2rem;">Score: <b>${playerScore}</b> &nbsp; Best: <b>${best}</b></span><br>
    <button id="restartBtn" style="margin-top:16px;padding:10px 28px;font-size:1rem;font-weight:700;background:#525252;color:#fff;border:2px solid #fff;border-radius:8px;cursor:pointer;letter-spacing:1px;">Restart</button>
  `;
  gameOver.style.display = 'block';
  document.getElementById('restartBtn').addEventListener('click', e => {
    e.stopPropagation();
    lockUntil = 0;
    startGame();
  });
  if (window.Arcade) Arcade.gameOver(playerScore);
};

window.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    isPlaying ? jump() : startGame();
  }
  if (e.key === 'ArrowUp') isPlaying ? jump() : startGame();
});
container.addEventListener('click', () => (isPlaying ? jump() : startGame()));
container.addEventListener('touchstart', e => {
  e.preventDefault();
  isPlaying ? jump() : startGame();
});

// Collision by actual sprite rectangles (inset for fairness) instead of
// the old hard-coded pixel ranges.
setInterval(() => {
  if (!isPlaying) return;
  const d = dino.getBoundingClientRect();
  const b = block.getBoundingClientRect();
  const pad = 12;
  if (
    d.right - pad > b.left + pad &&
    d.left + pad < b.right - pad &&
    d.bottom - pad > b.top + pad
  ) {
    stopGame();
  }
}, 10);

renderScore();
