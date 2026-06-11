# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo contains a single project: **topdown-shooter** ("Pixel Siege"), a retro 2D top-down shooter built with plain HTML/CSS/JS and the Canvas 2D API. There is no build step, no package manager, and no test framework — it's meant to run by opening `topdown-shooter/index.html` directly in a browser (`file://`), which is why all scripts are plain `<script>` tags rather than ES modules.

The repo root also has two unrelated standalone files (`tictactoe.html`, `tic-tac-toe.html`) — these are not part of the shooter project.

## Running / testing the game

- Open `topdown-shooter/index.html` directly in a browser (double-click works, no server needed).
- For automated verification, use Playwright (Python) with `channel="msedge"` (no Node.js or chromium-cli on this machine; Python is available). Build the `file:///` URL with `cygpath -w -a` to get a Windows-style path. After `page.goto`, the running game instance is exposed as `window.game`, so test scripts can call `window.game.update(dt)`, push enemies/pickups, etc., directly to drive scenarios. Delete temporary test scripts after use — none should be committed.

## Architecture

**Internal resolution & rendering**: The canvas is 320x240 internally, scaled up via CSS with `image-rendering: pixelated` for the retro look. All sprites (`js/sprites.js`) are drawn procedurally with `ctx.fillRect`/paths — there are no external image assets.

**Script load order matters** (see `index.html`): `sound.js`, `sprites.js`, `input.js`, `bullet.js`, `player.js`, `enemy.js`, `levels.js`, `game.js`, `main.js`. Since these are plain scripts (not modules), each file defines a global (`Sound`, `Sprites`, `Input`, `Bullet`, `Player`, `Enemy`, `Levels`, `Game`) that later files depend on directly.

**State machine**: `Game` (`js/game.js`) drives everything via `this.state`: `'menu'`, `'playing'`, `'paused'`, `'levelComplete'`, `'gameOver'`. `update(dt)` branches on state first; DOM overlay screens (menu, HUD, level-complete, game-over, pause in `index.html`) are toggled via the `.hidden` CSS class to match.

**Game loop**: `main.js` instantiates `Input`, then `Game`, exposes it as `window.game`, and calls `game.start()`, which kicks off `requestAnimationFrame` → `loop(timestamp)` → `update(dt)` + `draw()`.

**Core entities**:
- `Player` (`js/player.js`): position, movement (arrow keys via `Input`), aim angle (toward mouse), fire rate/cooldown, health, invulnerability timer (`takeDamage()` returns `false` while invulnerable so callers know whether to apply hit feedback).
- `Enemy` (`js/enemy.js`): four types defined in `ENEMY_STATS` (`chaser`, `shooter`, `swarmer`, `tank`) with per-type radius/speed/health/contact damage/score value. `Enemy.spawnAtEdge()` spawns just outside the canvas at a random edge. `update(dt, player, canvasWidth, canvasHeight)` contains per-type AI (chase, ranged with in-bounds check before firing, wobble/swarm movement). Returns a `Bullet` if it fires.
- `Bullet` (`js/bullet.js`): simple velocity + circle-circle collision (`hits(target)`); player and enemy bullets have different speeds and are distinguished by `fromPlayer`.
- `Levels` (`js/levels.js`): `getConfig(levelNum)` computes total enemies, speed multiplier, spawn interval, and enemy-type weights per level; `pickEnemyType(config)` does weighted random selection.
- `Sound` (`js/sound.js`): all SFX are generated procedurally via Web Audio oscillators/noise buffers — no audio files. Must call `Sound.init()` from a user gesture (autoplay policy). `Sound.toggleMute()` bound to the `M` key.

**Game-level mechanics wired in `js/game.js`**:
- `handleCollisions()`: player bullets vs enemies (damage, death, score, chance to drop a health pickup), enemy bullets vs player, enemy contact damage vs player. Hits that actually damage the player (i.e. `player.takeDamage()` returns `true`) trigger `shakeTimer`/`shakeMagnitude` for screen shake.
- `update(dt)`: spawns enemies per `levelConfig`, updates player/enemies/bullets, runs collisions, updates health pickups (lifespan + pickup-on-touch healing), decays shake timer, checks game-over/level-complete conditions.
- `draw()`: draws background, then (inside a shake-translated `ctx.save()/restore()`) pickups, enemies, bullets, player, and off-screen edge indicators (`drawEdgeIndicators()` projects off-screen enemy positions onto the screen border as colored arrows via `Sprites.drawEdgeIndicator`). After restoring the shake transform, draws a red vignette overlay proportional to `player.hitFlash`.

## Git / GitHub workflow

This project uses Git with clean, descriptive commit messages, committed and pushed to GitHub after each meaningful change: https://github.com/patrickbieke2017-source/Bassamba-siege-pixeliser (remote `origin`, branch `master`).
