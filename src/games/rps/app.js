const score = { player: 0, computer: 0, moves: 0 };
const handImages = { rock: 'rockhand.png', paper: 'paperhand.png', scissors: 'scissorhand.png' };
const elements = {
  startScreen: document.querySelector('.start-screen'),
  playBtn: document.querySelector('.play-btn'),
  bgMusic: document.querySelector('.bgmusic'),
  playerHand: document.querySelector('.player-hand'),
  computerHand: document.querySelector('.computer-hand'),
  playerImg: document.querySelector('.player-hand-img'),
  computerImg: document.querySelector('.computer-hand-img'),
  movesLeft: document.querySelector('.movesleft'),
  result: document.querySelector('.result'),
  reload: document.querySelector('.reload'),
  moveText: document.querySelector('.move'),
  playerScore: document.querySelector('.p-count'),
  computerScore: document.querySelector('.c-count'),
  options: [...document.querySelectorAll('.options button')]
};
const rules = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const showHand = (slot, img, choice) => {
  slot.querySelector('.placeholder').style.display = 'none';
  img.src = handImages[choice];
  img.style.display = 'block';
};
const resetRound = () => {
  elements.playerHand.className = 'hand-slot player-hand';
  elements.computerHand.className = 'hand-slot computer-hand';
  elements.result.textContent = '';
  elements.result.className = 'result';
};
const endGame = () => {
  elements.options.forEach(btn => (btn.style.display = 'none'));
  elements.moveText.innerText = 'Game Over!!';
  elements.movesLeft.style.display = 'none';
  const final = score.player > score.computer ? 'You Won The Game' : score.player < score.computer ? 'You Lost The Game' : 'Tie';
  elements.result.textContent = final;
  elements.result.className = `result ${score.player > score.computer ? 'win' : score.player < score.computer ? 'lose' : 'tie'}`;
  elements.result.style.fontSize = '2rem';
  elements.reload.innerText = 'Restart';
  elements.reload.style.display = 'flex';
  elements.reload.addEventListener('click', () => window.location.reload());
  if (window.Arcade) Arcade.gameOver(score.player);
};
const playRound = choice => {
  resetRound();
  const computer = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  elements.options.forEach(btn => (btn.disabled = true));
  showHand(elements.playerHand, elements.playerImg, choice);
  elements.computerImg.style.display = 'none';
  elements.computerHand.classList.add('thinking');
  const placeholder = elements.computerHand.querySelector('.placeholder');
  placeholder.textContent = '🤔';
  setTimeout(() => {
    placeholder.textContent = '❔';
    elements.computerHand.classList.remove('thinking');
    showHand(elements.computerHand, elements.computerImg, computer);
    elements.computerHand.classList.add('computer-glow');
    if (choice === computer) elements.result.textContent = 'Tie';
    else if (rules[choice] === computer) {
      score.player++;
      elements.result.textContent = 'Player Won';
      elements.playerHand.classList.add('winner');
    } else {
      score.computer++;
      elements.result.textContent = 'Computer Won';
      elements.computerHand.classList.add('winner');
    }
    elements.playerScore.textContent = score.player;
    elements.computerScore.textContent = score.computer;
    score.moves++;
    elements.movesLeft.innerText = `Moves Left: ${10 - score.moves}`;
    if (score.moves === 10) endGame();
    else elements.options.forEach(btn => (btn.disabled = false));
  }, 700);
};
const startGame = () => {
  elements.startScreen.style.display = 'none';
  elements.bgMusic.currentTime = 0;
  elements.bgMusic.play();
};
elements.playBtn.addEventListener('click', startGame);
// the button's class is "scissor" but the game logic keys use "scissors"
elements.options.forEach(btn => btn.addEventListener('click', () => playRound(btn.classList[0] === 'scissor' ? 'scissors' : btn.classList[0])));
