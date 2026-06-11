// Procedural pixel-art style sprite drawing (no external image assets).
const Sprites = {
  // ---------------------------------------------------------------
  // Player: body stays upright, gun rotates to aim, legs animate
  // ---------------------------------------------------------------
  drawPlayer(ctx, p) {
    const { x, y, aimAngle, walkPhase, moving, hitFlash } = p;
    ctx.save();
    ctx.translate(x, y);

    // Legs (animated feet poking out from behind the body)
    const legSwing = moving ? Math.sin(walkPhase) * 3 : 0;
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(-4, 4 + legSwing, 3, 4);
    ctx.fillRect(1, 4 - legSwing, 3, 4);

    // Body (square-ish torso, retro blocky look)
    const flash = hitFlash > 0;
    ctx.fillStyle = flash ? '#ffffff' : '#3a6ea5';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = flash ? '#eeeeee' : '#5dade2';
    ctx.fillRect(-5, -5, 10, 10);

    // Head
    ctx.fillStyle = flash ? '#ffffff' : '#dff1ff';
    ctx.fillRect(-3, -3, 6, 6);

    // Gun, rotated toward aim direction
    ctx.rotate(aimAngle);
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, -1, 9, 2);
    ctx.fillStyle = '#666666';
    ctx.fillRect(6, -1, 3, 2);

    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Enemy: 'chaser' (melee), 'shooter' (ranged), 'swarmer' (fast/weak),
  // 'tank' (slow/tough)
  // ---------------------------------------------------------------
  drawEnemy(ctx, e) {
    const { x, y, type, angle, walkPhase, hitFlash } = e;
    const flash = hitFlash > 0;
    const half = type === 'tank' ? 8 : type === 'swarmer' ? 4 : 6;
    const legLen = type === 'swarmer' ? 3 : 4;
    const legSwing = Math.sin(walkPhase) * (type === 'swarmer' ? 2 : 3);

    let outline, fill, legColor;
    switch (type) {
      case 'shooter':
        outline = '#6a1bb0'; fill = '#b25aff'; legColor = '#3a1010';
        break;
      case 'swarmer':
        outline = '#a35a00'; fill = '#ffb733'; legColor = '#5a2e00';
        break;
      case 'tank':
        outline = '#33402f'; fill = '#7a8f6c'; legColor = '#1f2419';
        break;
      default: // chaser
        outline = '#8a1414'; fill = '#ff5050'; legColor = '#3a1010';
    }
    if (flash) { outline = '#ffffff'; fill = '#eeeeee'; }

    ctx.save();
    ctx.translate(x, y);

    // Legs
    ctx.fillStyle = legColor;
    ctx.fillRect(-half - 2, half - 2 + legSwing, 3, legLen);
    ctx.fillRect(half - 1, half - 2 - legSwing, 3, legLen);

    // Body
    ctx.fillStyle = outline;
    ctx.fillRect(-half, -half, half * 2, half * 2);
    ctx.fillStyle = fill;
    ctx.fillRect(-half + 1, -half + 1, half * 2 - 2, half * 2 - 2);

    // Tank gets extra armor plating
    if (type === 'tank' && !flash) {
      ctx.fillStyle = '#5a6b4f';
      ctx.fillRect(-half + 2, -2, half * 2 - 4, 4);
    }

    // Eyes always glaring toward the player
    ctx.rotate(angle);
    ctx.fillStyle = '#1a0000';
    const eyeOffset = half - 4;
    ctx.fillRect(eyeOffset, -3, 2, 2);
    ctx.fillRect(eyeOffset, 1, 2, 2);

    // Shooters carry a small weapon
    if (type === 'shooter') {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, -1, 8, 2);
    }

    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Bullets
  // ---------------------------------------------------------------
  drawBullet(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color || (b.fromPlayer ? '#ffe066' : '#ff8a00');
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Muzzle flash: brief flash at the gun tip
  // ---------------------------------------------------------------
  drawMuzzleFlash(ctx, x, y, angle, life) {
    // life: 1 (just fired) -> 0 (faded)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = Math.max(life, 0);
    ctx.fillStyle = '#fff6b0';
    ctx.fillRect(8, -3, 5, 6);
    ctx.fillStyle = '#ffd400';
    ctx.fillRect(10, -1.5, 4, 3);
    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Explosion / death effect: expanding pixel particles
  // ---------------------------------------------------------------
  drawExplosion(ctx, x, y, life) {
    // life: 1 (just died) -> 0 (gone)
    const colors = ['#ffd400', '#ff8a00', '#ff3030', '#ffffff'];
    const radius = (1 - life) * 14;
    ctx.save();
    ctx.globalAlpha = Math.max(life, 0);
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      const px = x + Math.cos(ang) * radius;
      const py = y + Math.sin(ang) * radius;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Off-screen indicator: small arrow at the screen edge pointing
  // toward an enemy that hasn't entered the play area yet
  // ---------------------------------------------------------------
  drawEdgeIndicator(ctx, x, y, angle, type) {
    const colors = {
      shooter: '#b25aff',
      swarmer: '#ffb733',
      tank: '#7a8f6c',
      chaser: '#ff5050'
    };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = colors[type] || '#ff5050';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // ---------------------------------------------------------------
  // Health pickup: a small pulsing cross
  // ---------------------------------------------------------------
  drawHealthPack(ctx, x, y, life) {
    // life: seconds remaining before the pickup expires
    const blinking = life < 2.5 && Math.floor(life * 6) % 2 === 0;
    if (blinking) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#1c1c2e';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#3a9c00';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -1, 6, 2);
    ctx.fillRect(-1, -3, 2, 6);
    ctx.restore();
  }
};
