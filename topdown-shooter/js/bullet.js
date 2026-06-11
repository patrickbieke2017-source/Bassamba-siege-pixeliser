// A simple projectile fired by the player or by enemy 'shooters'.
class Bullet {
  constructor(x, y, angle, fromPlayer) {
    this.x = x;
    this.y = y;
    this.fromPlayer = fromPlayer;
    this.speed = fromPlayer ? 220 : 130;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = 2;
    this.alive = true;
  }

  update(dt, canvasWidth, canvasHeight) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < -10 || this.x > canvasWidth + 10 || this.y < -10 || this.y > canvasHeight + 10) {
      this.alive = false;
    }
  }

  draw(ctx) {
    Sprites.drawBullet(ctx, this);
  }

  // Circle-circle collision check against another entity with x, y, radius.
  hits(target) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const dist = Math.hypot(dx, dy);
    return dist < this.radius + target.radius;
  }
}
