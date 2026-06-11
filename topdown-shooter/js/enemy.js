// Enemies:
//  'chaser'  - basic melee grunt, rushes the player
//  'shooter' - keeps its distance and fires bullets
//  'swarmer' - fast, fragile, weaves erratically toward the player
//  'tank'    - slow but tough, hits hard on contact
const ENEMY_STATS = {
  chaser:  { radius: 6, baseSpeed: 45, health: 1, contactDamage: 8,  scoreValue: 100 },
  shooter: { radius: 6, baseSpeed: 30, health: 2, contactDamage: 4,  scoreValue: 200 },
  swarmer: { radius: 4, baseSpeed: 75, health: 1, contactDamage: 5,  scoreValue: 150 },
  tank:    { radius: 9, baseSpeed: 20, health: 5, contactDamage: 14, scoreValue: 350 }
};

class Enemy {
  constructor(x, y, type, speedMultiplier) {
    const stats = ENEMY_STATS[type] || ENEMY_STATS.chaser;
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = stats.radius;
    this.speed = stats.baseSpeed * speedMultiplier;
    this.health = stats.health;
    this.contactDamage = stats.contactDamage;
    this.scoreValue = stats.scoreValue;
    this.angle = 0;
    this.walkPhase = Math.random() * 10;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.alive = true;
    this.dying = false;
    this.deathTimer = 1;
    this.shootRange = 110;
    this.shootCooldown = 1.4 + Math.random() * 0.8;
    this.shootTimer = this.shootCooldown;
  }

  // Spawns an enemy just outside the visible canvas at a random edge,
  // so enemies approach the player from varying angles each time.
  static spawnAtEdge(canvasWidth, canvasHeight, type, speedMultiplier) {
    const margin = 14;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
      case 0: x = Math.random() * canvasWidth; y = -margin; break;          // top
      case 1: x = canvasWidth + margin; y = Math.random() * canvasHeight; break; // right
      case 2: x = Math.random() * canvasWidth; y = canvasHeight + margin; break; // bottom
      default: x = -margin; y = Math.random() * canvasHeight; break;        // left
    }
    return new Enemy(x, y, type, speedMultiplier);
  }

  // Returns a Bullet if this enemy fired this frame, otherwise null.
  update(dt, player, canvasWidth, canvasHeight) {
    if (this.hitFlash > 0) this.hitFlash -= dt * 8;

    if (this.dying) {
      this.deathTimer -= dt * 2;
      if (this.deathTimer <= 0) this.alive = false;
      return null;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    if (this.type === 'shooter') {
      // Shooters can spawn just outside the screen already within shootRange;
      // require them to enter the play area before they stop and start firing.
      const margin = 16;
      const inBounds = this.x > margin && this.x < canvasWidth - margin &&
                       this.y > margin && this.y < canvasHeight - margin;

      if (dist > this.shootRange || !inBounds) {
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.walkPhase += dt * 10;
      }

      this.shootTimer -= dt;
      if (inBounds && this.shootTimer <= 0 && dist < this.shootRange + 60) {
        this.shootTimer = this.shootCooldown;
        return new Bullet(this.x, this.y, this.angle, false);
      }
    } else if (this.type === 'swarmer') {
      // Weaves side to side while closing in, making it harder to hit.
      this.wobblePhase += dt * 6;
      const moveAngle = this.angle + Math.sin(this.wobblePhase) * 0.6;
      this.x += Math.cos(moveAngle) * this.speed * dt;
      this.y += Math.sin(moveAngle) * this.speed * dt;
      this.walkPhase += dt * 16;
    } else {
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
      this.walkPhase += dt * 10;
    }

    return null;
  }

  takeDamage(amount) {
    if (this.dying) return;
    this.health -= amount;
    this.hitFlash = 1;
    if (this.health <= 0) {
      this.dying = true;
      this.deathTimer = 1;
    }
  }

  draw(ctx) {
    if (this.dying) {
      Sprites.drawExplosion(ctx, this.x, this.y, this.deathTimer);
      return;
    }
    Sprites.drawEnemy(ctx, this);
  }
}
