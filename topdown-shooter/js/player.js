// The player character: movement, aiming, shooting, animation state.
class Player {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset();
  }

  reset() {
    this.x = this.canvasWidth / 2;
    this.y = this.canvasHeight / 2;
    this.radius = 6;
    this.speed = 75; // pixels per second
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.aimAngle = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.hitFlash = 0;
    this.fireRate = 0.13; // seconds between shots
    this.shootTimer = 0;
    this.muzzleFlash = 0;
    this.invulnTimer = 0;
  }

  update(dt, mouseX, mouseY) {
    let dx = 0;
    let dy = 0;
    if (Input.isDown('ArrowUp')) dy -= 1;
    if (Input.isDown('ArrowDown')) dy += 1;
    if (Input.isDown('ArrowLeft')) dx -= 1;
    if (Input.isDown('ArrowRight')) dx += 1;

    this.moving = dx !== 0 || dy !== 0;

    if (this.moving) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
      this.walkPhase += dt * 12;
    }

    // Keep player within bounds
    this.x = Math.max(this.radius, Math.min(this.canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.canvasHeight - this.radius, this.y));

    // Aim toward mouse cursor
    this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);

    // Timers
    if (this.shootTimer > 0) this.shootTimer -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 6;
    if (this.hitFlash > 0) this.hitFlash -= dt * 8;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
  }

  tryShoot() {
    if (this.shootTimer > 0) return null;
    this.shootTimer = this.fireRate;
    this.muzzleFlash = 1;

    const tipX = this.x + Math.cos(this.aimAngle) * 9;
    const tipY = this.y + Math.sin(this.aimAngle) * 9;
    return new Bullet(tipX, tipY, this.aimAngle, true);
  }

  // Returns true if the damage was actually applied (false while invulnerable).
  takeDamage(amount) {
    if (this.invulnTimer > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 1;
    this.invulnTimer = 0.6;
    return true;
  }

  draw(ctx) {
    Sprites.drawPlayer(ctx, {
      x: this.x,
      y: this.y,
      aimAngle: this.aimAngle,
      walkPhase: this.walkPhase,
      moving: this.moving,
      hitFlash: this.hitFlash
    });

    if (this.muzzleFlash > 0) {
      Sprites.drawMuzzleFlash(ctx, this.x, this.y, this.aimAngle, this.muzzleFlash);
    }
  }
}
