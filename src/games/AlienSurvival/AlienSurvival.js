(function () {
	const canvas = document.getElementById('game');
	const ctx = canvas.getContext('2d');
	const W = canvas.width;
	const H = canvas.height;

	const timeVal = document.getElementById('timeVal');
	const bestVal = document.getElementById('bestVal');
	const stageVal = document.getElementById('stageVal');
	const startScreen = document.getElementById('startScreen');
	const overScreen = document.getElementById('overScreen');
	const finalTime = document.getElementById('finalTime');
	const finalNote = document.getElementById('finalNote');
	const startBtn = document.getElementById('startBtn');
	const retryBtn = document.getElementById('retryBtn');
	const muteBtn = document.getElementById('muteBtn');

	const BEST_KEY = 'overload_best_time';
	let best = parseFloat(localStorage.getItem(BEST_KEY)) || 0;
	bestVal.textContent = best.toFixed(1);

	const assetBase = './';
	const images = {
		ship: new Image(),
		asteroid: new Image(),
		nuke: new Image(),
		nukeDed: new Image()
	};
	images.ship.src = `${assetBase}Alien_Ship.png`;
	images.asteroid.src = `${assetBase}Alien_Asteroid.png`;
	images.nuke.src = `${assetBase}Alien_Nuke.png`;
	images.nukeDed.src = `${assetBase}Alien_NukeDed.png`;

	const music = new Audio('./Alien_Music.mp3');
	music.loop = true;
	let musicMuted = false;

	const keys = {};
	window.addEventListener('keydown', (e) => {
		keys[e.key.toLowerCase()] = true;
		if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
			e.preventDefault();
		}
	});
	window.addEventListener('keyup', (e) => {
		keys[e.key.toLowerCase()] = false;
	});

	let running = false;
	let elapsed = 0;
	let lastTs = 0;

	const nukeWindow = 10;
	const maxNukesPerWindow = 2;
	let nukeWindowStart = 0;
	let nukesInWindow = 0;

	let player, shards, particles, inset, spawnTimer;
	let bullets, powerups, boss;
	let fireCooldown, powerTimer, nextBossAt;
	let shieldOn, rapidUntil, slowUntil, invulnUntil;

	function resetGame() {
		player = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 7 };
		shards = [];
		particles = [];
		bullets = [];
		powerups = [];
		boss = null;
		inset = 0;
		spawnTimer = 0;
		elapsed = 0;
		nukeWindowStart = 0;
		nukesInWindow = 0;
		fireCooldown = 0;
		powerTimer = 8;
		nextBossAt = 30;
		shieldOn = false;
		rapidUntil = 0;
		slowUntil = 0;
		invulnUntil = 0;
	}

	// burst of drifting particles for explosions and pickups
	function boom(x, y, color, n = 10) {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const sp = 0.6 + Math.random() * 2.2;
			particles.push({
				x, y,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp,
				life: 0.6 + Math.random() * 0.5,
				size: 2 + Math.random() * 3,
				color
			});
		}
	}

	function autoAimDir() {
		let target = null;
		let bestDist = Infinity;
		const candidates = boss ? shards.concat([boss]) : shards;
		for (const t of candidates) {
			if (t.dead || t.state === 'despawning') continue;
			const d = Math.hypot(t.x - player.x, t.y - player.y);
			if (d < bestDist) { bestDist = d; target = t; }
		}
		if (target) return [target.x - player.x, target.y - player.y];
		const speed = Math.hypot(player.vx, player.vy);
		if (speed > 0.6) return [player.vx, player.vy];
		return [0, -1];
	}

	function shoot(dx, dy) {
		if (!running || fireCooldown > 0) return;
		let dir = dx === undefined ? autoAimDir() : [dx, dy];
		const mag = Math.hypot(dir[0], dir[1]) || 1;
		bullets.push({
			x: player.x,
			y: player.y,
			vx: (dir[0] / mag) * 9,
			vy: (dir[1] / mag) * 9,
			life: 1.4
		});
		fireCooldown = elapsed < rapidUntil ? 0.1 : 0.3;
		boom(player.x, player.y, '#4de3ff', 3);
	}

	canvas.addEventListener('pointerdown', (e) => {
		if (!running) return;
		const rect = canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) * (W / rect.width);
		const my = (e.clientY - rect.top) * (H / rect.height);
		shoot(mx - player.x, my - player.y);
	});

	function stageOf(t) {
		return Math.floor(t / 10) + 1;
	}

	function drawSprite(img, x, y, size, angle = 0) {
		if (!img || !img.complete || img.naturalWidth === 0) {
			return;
		}
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
	}

	function updateNukeQuota() {
		if (elapsed - nukeWindowStart >= nukeWindow) {
			nukeWindowStart = elapsed;
			nukesInWindow = 0;
		}
	}

	function spawnShard() {
		const stage = stageOf(elapsed);
		const edge = Math.floor(Math.random() * 4);
		let x, y;
		if (edge === 0) { x = -20; y = Math.random() * H; }
		else if (edge === 1) { x = W + 20; y = Math.random() * H; }
		else if (edge === 2) { x = Math.random() * W; y = -20; }
		else { x = Math.random() * W; y = H + 20; }

		const baseSpeed = 1.6 + stage * 0.22;
		const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.1;
		let homing = false;
		if (elapsed > 14) {
			updateNukeQuota();
			const canSpawnNuke = nukesInWindow < maxNukesPerWindow;
			const nukeRoll = Math.random() < Math.min(0.5, (elapsed - 14) / 40);
			if (canSpawnNuke && nukeRoll) {
				homing = true;
				nukesInWindow += 1;
			}
		}

		shards.push({
			x,
			y,
			vx: Math.cos(angle) * baseSpeed,
			vy: Math.sin(angle) * baseSpeed,
			size: 8 + Math.random() * 7,
			homing,
			speed: baseSpeed * (homing ? 0.85 : 1),
			hue: homing ? 45 : 350,
			age: 0,
			ttl: 8,
			state: 'active',
			despawnTimer: 0.45
		});
	}

	function update(dt) {
		elapsed += dt;
		timeVal.textContent = elapsed.toFixed(1);
		stageVal.textContent = stageOf(elapsed);

		// ---- player movement: inertia-based, not instant ----
		const accel = 0.62;
		const friction = 0.965;
		const maxSpeed = 6.4;

		let ax = 0, ay = 0;
		if (keys['arrowleft'] || keys['a']) ax -= accel;
		if (keys['arrowright'] || keys['d']) ax += accel;
		if (keys['arrowup'] || keys['w']) ay -= accel;
		if (keys['arrowdown'] || keys['s']) ay += accel;

		player.vx = (player.vx + ax) * friction;
		player.vy = (player.vy + ay) * friction;

		const speed = Math.hypot(player.vx, player.vy);
		if (speed > maxSpeed) {
			player.vx = (player.vx / speed) * maxSpeed;
			player.vy = (player.vy / speed) * maxSpeed;
		}

		player.x += player.vx;
		player.y += player.vy;

		// ---- shooting ----
		fireCooldown -= dt;
		if (keys[' ']) shoot();

		// trail particle
		if (Math.random() < 0.6) {
			particles.push({ x: player.x, y: player.y, life: 1, color: '#4de3ff' });
		}
		particles.forEach(p => {
			p.life -= 0.045;
			p.x += p.vx || 0;
			p.y += p.vy || 0;
		});
		particles = particles.filter(p => p.life > 0);

		for (const s of shards) {
			if (s.homing && s.state !== 'despawning' && Math.random() < 0.28) {
				particles.push({ x: s.x, y: s.y, life: 0.75, color: '#ff5d5d' });
			}
		}

		// ---- shrinking arena ----
		inset = Math.min(150, elapsed * 1.05);

		if (
			player.x - player.r < inset ||
			player.x + player.r > W - inset ||
			player.y - player.r < inset ||
			player.y + player.r > H - inset
		) {
			return endGame('The arena closed in on you.');
		}

		// ---- spawn shards, ramping up ----
		spawnTimer -= dt * 1000;
		const spawnInterval = Math.max(140, 850 - elapsed * 16);
		if (spawnTimer <= 0) {
			spawnShard();
			spawnTimer = spawnInterval;
		}

		// ---- move shards ----
		const slowFactor = elapsed < slowUntil ? 0.5 : 1;
		for (const s of shards) {
			if (s.dead) continue;
			s.age += dt;
			if (s.homing && s.state === 'active' && s.age >= s.ttl - s.despawnTimer) {
				s.state = 'despawning';
			}
			if (s.state === 'despawning') {
				s.despawnTimer = Math.max(0, s.despawnTimer - dt);
			}
			if (s.homing && s.state !== 'despawning') {
				const angle = Math.atan2(player.y - s.y, player.x - s.x);
				s.vx += Math.cos(angle) * 0.05;
				s.vy += Math.sin(angle) * 0.05;
				const sp = Math.hypot(s.vx, s.vy);
				if (sp > s.speed) {
					s.vx = (s.vx / sp) * s.speed;
					s.vy = (s.vy / sp) * s.speed;
				}
			}
			s.x += s.vx * slowFactor;
			s.y += s.vy * slowFactor;

			const dx = s.x - player.x;
			const dy = s.y - player.y;
			const dist = Math.hypot(dx, dy);
			if (dist < s.size / 2 + player.r - 2) {
				if (elapsed < invulnUntil) continue;
				if (shieldOn) {
					// the shield eats the hit and grants a moment of safety
					shieldOn = false;
					invulnUntil = elapsed + 1.0;
					s.dead = true;
					boom(s.x, s.y, '#7ec4ff', 12);
					continue;
				}
				return endGame('Clipped by a shard.');
			}
		}

		// ---- bullets ----
		for (const b of bullets) {
			b.x += b.vx;
			b.y += b.vy;
			b.life -= dt;
			if (boss && b.life > 0 && Math.hypot(b.x - boss.x, b.y - boss.y) < 48) {
				b.life = 0;
				boss.hp--;
				boom(b.x, b.y, '#ffcb47', 6);
				if (boss.hp <= 0) {
					boom(boss.x, boss.y, '#ffcb47', 30);
					shards.forEach(s => { s.dead = true; boom(s.x, s.y, '#ff5d5d', 3); });
					boss = null;
					invulnUntil = elapsed + 1.5;
					nextBossAt = elapsed + 30;
				}
				continue;
			}
			for (const s of shards) {
				if (!s.dead && Math.hypot(b.x - s.x, b.y - s.y) < s.size / 2 + 6) {
					s.dead = true;
					b.life = 0;
					boom(s.x, s.y, s.homing ? '#ffcb47' : '#ff5d5d', 8);
					break;
				}
			}
		}
		bullets = bullets.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

		// ---- power-ups ----
		powerTimer -= dt;
		if (powerTimer <= 0) {
			const types = ['shield', 'rapid', 'slow'];
			const margin = inset + 45;
			powerups.push({
				x: margin + Math.random() * (W - margin * 2),
				y: margin + Math.random() * (H - margin * 2),
				type: types[Math.floor(Math.random() * types.length)],
				ttl: 6,
				phase: Math.random() * 6
			});
			powerTimer = 9 + Math.random() * 4;
		}
		for (const p of powerups) {
			p.ttl -= dt;
			p.phase += dt * 3;
			if (Math.hypot(p.x - player.x, p.y - player.y) < 16 + player.r) {
				p.ttl = 0;
				if (p.type === 'shield') shieldOn = true;
				if (p.type === 'rapid') rapidUntil = elapsed + 6;
				if (p.type === 'slow') slowUntil = elapsed + 5;
				boom(p.x, p.y, '#7dff8a', 10);
			}
		}
		powerups = powerups.filter(p => p.ttl > 0);

		// ---- boss: giant asteroid that lobs aimed volleys, killable with bullets ----
		if (!boss && elapsed >= nextBossAt) {
			boss = { x: W / 2, y: -70, hp: 12, maxHp: 12, t: 0, fireTimer: 1.7 };
		}
		if (boss) {
			boss.t += dt;
			const targetY = inset + 95;
			boss.y += (targetY - boss.y) * Math.min(1, dt * 2);
			const span = Math.max(40, W / 2 - inset - 100);
			boss.x = W / 2 + Math.sin(boss.t * 0.6) * span;

			if (Math.abs(boss.y - targetY) < 30) {
				boss.fireTimer -= dt;
				if (boss.fireTimer <= 0) {
					boss.fireTimer = 1.7;
					const base = Math.atan2(player.y - boss.y, player.x - boss.x);
					for (const off of [-0.25, 0, 0.25]) {
						const sp = 3 + stageOf(elapsed) * 0.15;
						shards.push({
							x: boss.x, y: boss.y,
							vx: Math.cos(base + off) * sp,
							vy: Math.sin(base + off) * sp,
							size: 9, homing: false, speed: sp, hue: 20,
							age: 0, ttl: 6, state: 'active', despawnTimer: 0.45
						});
					}
				}
			}

			const bossDist = Math.hypot(boss.x - player.x, boss.y - player.y);
			if (bossDist < 46 + player.r && elapsed >= invulnUntil) {
				if (shieldOn) {
					shieldOn = false;
					invulnUntil = elapsed + 1.2;
				} else {
					return endGame('Crushed by the boss asteroid.');
				}
			}
		}

		// cull shards way off-screen, expired or destroyed
		shards = shards.filter(s => {
			if (s.dead) return false;
			if (s.state === 'despawning' && s.despawnTimer <= 0) {
				return false;
			}
			return s.age < s.ttl && s.x > -80 && s.x < W + 80 && s.y > -80 && s.y < H + 80;
		});
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);

		// background grid
		ctx.strokeStyle = 'rgba(77,227,255,0.05)';
		ctx.lineWidth = 1;
		for (let gx = 0; gx < W; gx += 30) {
			ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
		}
		for (let gy = 0; gy < H; gy += 30) {
			ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
		}

		// shrinking boundary
		ctx.strokeStyle = 'rgba(255,61,90,0.85)';
		ctx.lineWidth = 3;
		ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

		// particles (trail)
		particles.forEach(p => {
			ctx.globalAlpha = Math.max(p.life, 0) * 0.8;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size || 3.5, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.globalAlpha = 1;

		// bullets
		bullets.forEach(b => {
			ctx.save();
			ctx.shadowColor = '#4de3ff';
			ctx.shadowBlur = 8;
			ctx.fillStyle = '#bdf3ff';
			ctx.beginPath();
			ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		});

		// power-ups: pulsing orbs with an icon
		const icons = { shield: '🛡', rapid: '⚡', slow: '🐌' };
		powerups.forEach(p => {
			const pulse = 1 + Math.sin(p.phase) * 0.15;
			const blink = p.ttl < 1.5 && Math.floor(p.ttl * 6) % 2 === 0;
			if (blink) return;
			ctx.save();
			ctx.shadowColor = '#7dff8a';
			ctx.shadowBlur = 14;
			ctx.fillStyle = 'rgba(20, 40, 30, 0.85)';
			ctx.strokeStyle = '#7dff8a';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(p.x, p.y, 15 * pulse, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.shadowBlur = 0;
			ctx.font = '15px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(icons[p.type], p.x, p.y + 1);
			ctx.restore();
		});

		// boss + health bar
		if (boss) {
			ctx.save();
			ctx.shadowColor = '#ff3d5a';
			ctx.shadowBlur = 26;
			drawSprite(images.asteroid, boss.x, boss.y, 96, boss.t * 0.4);
			ctx.restore();
			const barW = 84;
			const ratio = Math.max(0, boss.hp / boss.maxHp);
			ctx.fillStyle = 'rgba(0,0,0,0.55)';
			ctx.fillRect(boss.x - barW / 2, boss.y - 66, barW, 8);
			ctx.fillStyle = ratio > 0.35 ? '#ff3d5a' : '#ffcb47';
			ctx.fillRect(boss.x - barW / 2, boss.y - 66, barW * ratio, 8);
			ctx.strokeStyle = 'rgba(255,255,255,0.4)';
			ctx.strokeRect(boss.x - barW / 2, boss.y - 66, barW, 8);
		}

		// shards
		shards.forEach(s => {
			const drawSize = s.homing ? Math.max(28, s.size * 3.2) : Math.max(16, s.size * 2.2);
			if (s.homing && s.state === 'despawning') {
				ctx.save();
				ctx.globalAlpha = Math.max(0, s.despawnTimer / 0.45);
				drawSprite(images.nukeDed, s.x, s.y, drawSize, Math.atan2(s.vy, s.vx) + Math.PI / 2 + Math.PI);
				ctx.restore();
				return;
			}
			const sprite = s.homing ? images.nuke : images.asteroid;
			const angle = s.homing ? Math.atan2(s.vy, s.vx) + Math.PI / 2 + Math.PI : (s.x + s.y) * 0.02;
			drawSprite(sprite, s.x, s.y, drawSize, angle);
		});

		// player (flickers while invulnerable)
		const invuln = running && elapsed < invulnUntil;
		if (invuln) ctx.globalAlpha = Math.floor(elapsed * 12) % 2 === 0 ? 0.35 : 0.9;
		const playerAngle = Math.atan2(player.vy, player.vx) || 0;
		drawSprite(images.ship, player.x, player.y, 26, playerAngle + Math.PI / 2);
		ctx.globalAlpha = 1;

		// shield bubble
		if (shieldOn) {
			ctx.save();
			ctx.strokeStyle = 'rgba(126, 196, 255, 0.85)';
			ctx.shadowColor = '#7ec4ff';
			ctx.shadowBlur = 12;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		}

		// active effect labels
		if (running) {
			const fx = [];
			if (shieldOn) fx.push('🛡 SHIELD');
			if (elapsed < rapidUntil) fx.push(`⚡ RAPID ${(rapidUntil - elapsed).toFixed(1)}s`);
			if (elapsed < slowUntil) fx.push(`🐌 SLOW ${(slowUntil - elapsed).toFixed(1)}s`);
			ctx.font = 'bold 13px sans-serif';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillStyle = '#9ad1ff';
			fx.forEach((t, i) => ctx.fillText(t, 14, H - 16 - i * 20));
		}
	}

	function loop(ts) {
		if (!running) return;
		const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
		lastTs = ts;

		update(dt);
		if (!running) return; // ended mid-update
		draw();
		requestAnimationFrame(loop);
	}

	function endGame(reason) {
		running = false;
		if (elapsed > best) {
			best = elapsed;
			localStorage.setItem(BEST_KEY, best.toFixed(2));
		}
		bestVal.textContent = best.toFixed(1);
		finalTime.textContent = `Survived ${elapsed.toFixed(1)}s`;
		finalNote.textContent = reason + ' Stage ' + stageOf(elapsed) + '. Best: ' + best.toFixed(1) + 's.';
		overScreen.classList.remove('hide');
		if (window.Arcade) Arcade.gameOver(elapsed);
	}

	function startGame() {
		resetGame();
		startScreen.classList.add('hide');
		overScreen.classList.add('hide');
		music.muted = musicMuted;
		music.play().catch(() => {
			// autoplay may be blocked until user interaction; start button click should satisfy it
		});
		running = true;
		lastTs = performance.now();
		requestAnimationFrame(loop);
	}

	startBtn.addEventListener('click', startGame);
	retryBtn.addEventListener('click', startGame);
	muteBtn.addEventListener('click', () => {
		musicMuted = !musicMuted;
		music.muted = musicMuted;
		muteBtn.textContent = musicMuted ? 'Unmute' : 'Mute';
	});

	// idle render before game starts
	resetGame();
	draw();
})();