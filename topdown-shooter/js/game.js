// Core game loop, state machine, collisions, scoring and HUD wiring.
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.player = new Player(this.width, this.height);
    this.state = 'menu';
    this.lastTime = 0;

    // DOM references
    this.hud = document.getElementById('hud');
    this.healthBar = document.getElementById('health-bar');
    this.scoreEl = document.getElementById('score');
    this.levelEl = document.getElementById('level');
    this.menuScreen = document.getElementById('menu-screen');
    this.levelCompleteScreen = document.getElementById('level-complete-screen');
    this.levelCompleteTitle = document.getElementById('level-complete-title');
    this.levelCompleteScore = document.getElementById('level-complete-score');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.finalScore = document.getElementById('final-score');
    this.finalLevel = document.getElementById('final-level');
    this.pauseScreen = document.getElementById('pause-screen');

    this.loop = this.loop.bind(this);
    this.bindButtons();
  }

  bindButtons() {
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Enter' || e.code === 'Space') &&
          (this.state === 'menu' || this.state === 'gameOver')) {
        this.startGame();
      }
      if (e.code === 'KeyM') {
        Sound.toggleMute();
      }
    });
  }

  startGame() {
    Sound.init();
    Sound.menuSelect();
    this.player.reset();
    this.score = 0;
    this.level = 1;
    this.bullets = [];
    this.enemies = [];
    this.pickups = [];
    this.shakeTimer = 0;
    this.shakeMagnitude = 0;
    this.scoreEl.textContent = this.score;
    this.startLevel();

    this.state = 'playing';
    this.menuScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.levelCompleteScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  startLevel() {
    this.levelConfig = Levels.getConfig(this.level);
    this.enemiesSpawned = 0;
    this.spawnTimer = 0.5;
    this.levelEl.textContent = this.level;
  }

  update(dt) {
    if (Input.consumePause()) {
      if (this.state === 'playing') {
        this.state = 'paused';
        this.pauseScreen.classList.remove('hidden');
        return;
      } else if (this.state === 'paused') {
        this.state = 'playing';
        this.pauseScreen.classList.add('hidden');
      }
    }

    if (this.state === 'levelComplete') {
      this.levelTransitionTimer -= dt;
      if (this.levelTransitionTimer <= 0) {
        this.level++;
        this.startLevel();
        this.levelCompleteScreen.classList.add('hidden');
        this.state = 'playing';
      }
      return;
    }

    if (this.state !== 'playing') return;

    // Spawn enemies for the current wave
    if (this.enemiesSpawned < this.levelConfig.totalEnemies) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = Levels.pickEnemyType(this.levelConfig);
        this.enemies.push(Enemy.spawnAtEdge(this.width, this.height, type, this.levelConfig.speedMultiplier));
        this.enemiesSpawned++;
        this.spawnTimer = this.levelConfig.spawnInterval;
      }
    }

    // Player
    this.player.update(dt, Input.mouse.x, Input.mouse.y);
    if (Input.mouse.down) {
      const bullet = this.player.tryShoot();
      if (bullet) {
        this.bullets.push(bullet);
        Sound.shoot();
      }
    }

    // Enemies
    for (const enemy of this.enemies) {
      const bullet = enemy.update(dt, this.player, this.width, this.height);
      if (bullet) this.bullets.push(bullet);
    }

    // Bullets
    for (const bullet of this.bullets) {
      bullet.update(dt, this.width, this.height);
    }

    this.handleCollisions();

    // Pickups: count down lifespan and let the player walk over them to heal
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      const dist = Math.hypot(pickup.x - this.player.x, pickup.y - this.player.y);
      if (dist < pickup.radius + this.player.radius) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
        pickup.life = 0;
        Sound.heal();
      }
    }
    this.pickups = this.pickups.filter((p) => p.life > 0);

    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    // Cleanup
    this.bullets = this.bullets.filter((b) => b.alive);
    this.enemies = this.enemies.filter((e) => e.alive);

    // HUD
    this.healthBar.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;

    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    if (this.enemiesSpawned >= this.levelConfig.totalEnemies && this.enemies.length === 0) {
      this.levelComplete();
    }
  }

  handleCollisions() {
    // Player bullets vs enemies
    for (const bullet of this.bullets) {
      if (!bullet.alive || !bullet.fromPlayer) continue;
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.dying) continue;
        if (bullet.hits(enemy)) {
          bullet.alive = false;
          enemy.takeDamage(1);
          if (enemy.dying) {
            this.score += enemy.scoreValue;
            this.scoreEl.textContent = this.score;
            Sound.enemyDeath();
            if (Math.random() < 0.15) {
              this.pickups.push({ x: enemy.x, y: enemy.y, radius: 5, life: 8 });
            }
          } else {
            Sound.enemyHit();
          }
          break;
        }
      }
    }

    // Enemy bullets vs player
    for (const bullet of this.bullets) {
      if (!bullet.alive || bullet.fromPlayer) continue;
      if (bullet.hits(this.player)) {
        bullet.alive = false;
        if (this.player.takeDamage(8)) {
          Sound.playerHit();
          this.shakeTimer = 0.2;
          this.shakeMagnitude = 4;
        }
      }
    }

    // Enemy contact damage
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.dying) continue;
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < enemy.radius + this.player.radius) {
        if (this.player.takeDamage(enemy.contactDamage)) {
          Sound.playerHit();
          this.shakeTimer = 0.2;
          this.shakeMagnitude = 4;
        }
      }
    }
  }

  levelComplete() {
    this.state = 'levelComplete';
    this.levelCompleteTitle.textContent = `LEVEL ${this.level} COMPLETE!`;
    this.levelCompleteScore.textContent = `Score: ${this.score}`;
    this.levelCompleteScreen.classList.remove('hidden');
    this.levelTransitionTimer = 2.5;
    Sound.levelComplete();
  }

  gameOver() {
    Sound.gameOver();
    this.state = 'gameOver';
    this.finalScore.textContent = `Score: ${this.score}`;
    this.finalLevel.textContent = `Reached Level: ${this.level}`;
    this.gameOverScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= this.width; gx += 16) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, this.height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= this.height; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(this.width, gy + 0.5);
      ctx.stroke();
    }
  }

  draw() {
    this.drawBackground();

    if (this.state === 'menu') return;

    const ctx = this.ctx;
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeMagnitude;
      shakeY = (Math.random() * 2 - 1) * this.shakeMagnitude;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    for (const pickup of this.pickups) Sprites.drawHealthPack(ctx, pickup.x, pickup.y, pickup.life);
    for (const enemy of this.enemies) enemy.draw(ctx);
    for (const bullet of this.bullets) bullet.draw(ctx);
    this.player.draw(ctx);
    this.drawEdgeIndicators(ctx);

    ctx.restore();

    if (this.player.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.35 * this.player.hitFlash})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  // Draws an arrow at the screen edge for each enemy that is currently
  // off-screen, pointing toward it and colored by enemy type.
  drawEdgeIndicators(ctx) {
    const margin = 10;
    for (const enemy of this.enemies) {
      if (enemy.dying) continue;
      if (enemy.x >= 0 && enemy.x <= this.width && enemy.y >= 0 && enemy.y <= this.height) continue;

      const cx = this.width / 2;
      const cy = this.height / 2;
      const angle = Math.atan2(enemy.y - cy, enemy.x - cx);

      // Intersect the ray from center toward the enemy with the inset screen rect.
      const halfW = this.width / 2 - margin;
      const halfH = this.height / 2 - margin;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const scale = Math.min(
        dx !== 0 ? Math.abs(halfW / dx) : Infinity,
        dy !== 0 ? Math.abs(halfH / dy) : Infinity
      );

      const ix = cx + dx * scale;
      const iy = cy + dy * scale;
      Sprites.drawEdgeIndicator(ctx, ix, iy, angle, enemy.type);
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }

  start() {
    requestAnimationFrame((timestamp) => {
      this.lastTime = timestamp;
      requestAnimationFrame(this.loop);
    });
  }
}
