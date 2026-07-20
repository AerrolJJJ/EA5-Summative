const playerMaxHealth = 150;
let playerHealth = playerMaxHealth;
let enemyMaxHealth = 50;
let enemyHealth = enemyMaxHealth;
let enemyCount = 1;
let shieldValue = 0;
let gameOver = false;
let healCooldown = 2; // starts ready
let enemyTurnCounter = 0;
let defeatedEnemies = 0;
let playerTurn = true;

const attackBtn = document.getElementById('attackBtn');
const shieldBtn = document.getElementById('shieldBtn');
const healBtn = document.getElementById('healBtn');
const retryBtn = document.getElementById('retryBtn');
const playerBox = document.querySelector('.player-frame');
const enemyBox = document.querySelector('.enemy-frame');

attackBtn.addEventListener('click', () => playerMove('attack'));
shieldBtn.addEventListener('click', () => playerMove('shield'));
healBtn.addEventListener('click', () => playerMove('heal'));
retryBtn.addEventListener('click', retryGame);

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function critMultiplier() {
  return 1.2 + Math.random() * 0.3;
}

const isBossFight = () => enemyCount % 5 === 0;

/* ---------- animation helpers ---------- */

function animate(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function floatText(box, text, cls) {
  const span = document.createElement('span');
  span.className = 'float-num ' + cls;
  span.textContent = text;
  box.appendChild(span);
  setTimeout(() => span.remove(), 1100);
}

/* ---------- enemies ---------- */

function setEnemyHP() {
  if (enemyCount % 5 === 0) {
    enemyMaxHealth = 70 + enemyCount * 4;
    document.getElementById('enemyType').textContent = `Boss #${enemyCount}`;
    document.getElementById('enemySprite').src = 'Boss.png';
    document.getElementById('enemySprite').alt = 'Boss';
  } else if ([3, 8, 13].includes(enemyCount)) {
    enemyMaxHealth = 60 + enemyCount * 2;
    document.getElementById('enemyType').textContent = `Mini-Boss #${enemyCount}`;
    document.getElementById('enemySprite').src = 'Mini-Boss.png';
    document.getElementById('enemySprite').alt = 'Mini Boss';
  } else {
    enemyMaxHealth = 50;
    document.getElementById('enemyType').textContent = `Normal Enemy #${enemyCount}`;
    document.getElementById('enemySprite').src = 'Normal Enemy.png';
    document.getElementById('enemySprite').alt = 'Normal Enemy';
  }
  enemyHealth = enemyMaxHealth;
}

function toggleButtons(enable) {
  attackBtn.disabled = !enable;
  shieldBtn.disabled = !enable;
  healBtn.disabled = !enable;
  healBtn.querySelector('span').textContent = healCooldown >= 2 ? 'Heal' : 'Heal (charging)';
}

/* ---------- turns ---------- */

function playerMove(action) {
  if (gameOver || !playerTurn) return;

  let result;
  switch (action) {
    case 'attack': {
      let dmg = randomInRange(10, 40);
      let crit = false;
      if (Math.random() < 0.1) {
        dmg = Math.floor(dmg * critMultiplier());
        crit = true;
        result = `Critical Damage: ${dmg}`;
      } else {
        result = `Damage: ${dmg}`;
      }
      enemyHealth -= dmg;
      animate(playerBox, 'lunge-right');
      animate(enemyBox, 'hit-shake');
      floatText(enemyBox, `-${dmg}`, crit ? 'crit' : 'dmg');
      if (crit) floatText(enemyBox, 'CRIT!', 'crit-label');
      break;
    }
    case 'shield':
      shieldValue = randomInRange(15, 25);
      result = `Shield active: ${shieldValue}`;
      playerBox.classList.add('shielded');
      animate(playerBox, 'shield-pulse');
      floatText(playerBox, `🛡 ${shieldValue}`, 'shield');
      break;
    case 'heal': {
      if (healCooldown < 2) {
        setStatus('Heal not ready yet!');
        return;
      }
      let healAmt = randomInRange(25, 45);
      playerHealth = Math.min(playerMaxHealth, playerHealth + healAmt);
      result = `Healed ${healAmt}`;
      healCooldown = 0;
      animate(playerBox, 'heal-pulse');
      floatText(playerBox, `+${healAmt}`, 'heal');
      break;
    }
  }

  if (enemyHealth <= 0) {
    defeatedEnemies++;
    enemyCount++;
    animate(enemyBox, 'defeat-out');
    setTimeout(() => {
      setEnemyHP();
      animate(enemyBox, 'slide-in');
      updateUI();
    }, 450);
  }

  updateUI();
  setStatus(result);
  playerTurn = false;
  toggleButtons(false);

  if (playerHealth > 0) {
    setTimeout(enemyMove, 1100);
  }
}

function enemyMove() {
  if (gameOver) return;

  healCooldown++;
  enemyTurnCounter++;
  let result;

  if (enemyTurnCounter % 3 === 0 && Math.random() < 0.15 && enemyHealth < enemyMaxHealth) {
    let healAmt = Math.max(3, Math.floor(enemyMaxHealth * 0.12));
    enemyHealth = Math.min(enemyMaxHealth, enemyHealth + healAmt);
    result = `Enemy heals ${healAmt}`;
    animate(enemyBox, 'heal-pulse');
    floatText(enemyBox, `+${healAmt}`, 'heal');
  } else {
    // damage grows with your progress so late fights stay dangerous but early ones are fair
    let dmg = randomInRange(8, 18) + enemyCount;
    if (isBossFight()) dmg = Math.floor(dmg * 1.5);
    if (Math.random() < 0.1) {
      dmg = Math.floor(dmg * critMultiplier());
      result = `Enemy critical ${dmg}`;
    } else {
      result = `Enemy damage ${dmg}`;
    }
    if (shieldValue > 0) {
      const blocked = Math.min(shieldValue, dmg);
      dmg -= blocked;
      shieldValue = 0;
      playerBox.classList.remove('shielded');
      floatText(playerBox, `🛡 blocked ${blocked}`, 'shield');
    }
    playerHealth -= dmg;
    animate(enemyBox, 'lunge-left');
    animate(playerBox, 'hit-shake');
    floatText(playerBox, `-${dmg}`, 'dmg');
  }

  updateUI();

  if (playerHealth <= 0) {
    setStatus('Player has died. Game Over.');
    endGame();
    return;
  }

  setStatus(result);
  playerTurn = true;
  toggleButtons(true);
}

/* ---------- UI ---------- */

function updateUI() {
  const playerPercent = Math.max(0, Math.min(100, Math.round((playerHealth / playerMaxHealth) * 100)));
  const enemyPercent = Math.max(0, Math.min(100, Math.round((enemyHealth / enemyMaxHealth) * 100)));
  document.getElementById('playerHealth').textContent = `${Math.max(0, playerHealth)} / ${playerMaxHealth}`;
  document.getElementById('enemyHealth').textContent = `${Math.max(0, enemyHealth)} / ${enemyMaxHealth}`;
  document.getElementById('playerBar').style.width = playerPercent + '%';
  document.getElementById('enemyBar').style.width = enemyPercent + '%';
  document.getElementById('playerBar').style.background = playerPercent > 35 ? 'linear-gradient(90deg, #98ff7a, #52d677)' : '#f25f5f';
  document.getElementById('enemyBar').style.background = enemyPercent > 35 ? 'linear-gradient(90deg, #ff8a66, #ec2f45)' : '#f25f5f';
  document.getElementById('killCount').textContent = `Defeated: ${defeatedEnemies}`;
}

function setStatus(message) {
  const status = document.getElementById('statusMessage');
  status.classList.remove('active');
  void status.offsetWidth;
  status.textContent = message;
  status.classList.add('active');
}

function endGame() {
  gameOver = true;
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('stats').textContent = `You defeated ${defeatedEnemies} enemies.`;
  toggleButtons(false);
  if (window.Arcade) Arcade.gameOver(defeatedEnemies);
}

function retryGame() {
  playerHealth = playerMaxHealth;
  enemyCount = 1;
  shieldValue = 0;
  gameOver = false;
  healCooldown = 2;
  enemyTurnCounter = 0;
  defeatedEnemies = 0;
  playerTurn = true;
  playerBox.classList.remove('shielded');
  setStatus('Ready for battle');

  setEnemyHP();
  updateUI();
  document.getElementById('overlay').style.display = 'none';
  toggleButtons(true);
}

setEnemyHP();
updateUI();
toggleButtons(true);
