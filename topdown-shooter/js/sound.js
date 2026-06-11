// Tiny procedural retro sound-effect generator (Web Audio API, no audio files).
const Sound = {
  ctx: null,
  master: null,
  muted: false,

  // Must be called from a user gesture (e.g. a click) to satisfy autoplay policies.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  },

  tone(freq, duration, type, volume, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  },

  noise(duration, volume) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    src.connect(gain).connect(this.master);
    src.start();
  },

  shoot() {
    this.tone(880, 0.07, 'square', 0.07, 440);
  },
  enemyHit() {
    this.tone(180, 0.05, 'square', 0.08, 90);
  },
  enemyDeath() {
    this.noise(0.2, 0.12);
    this.tone(160, 0.25, 'sawtooth', 0.1, 40);
  },
  playerHit() {
    this.tone(110, 0.2, 'sawtooth', 0.15, 55);
  },
  heal() {
    this.tone(440, 0.08, 'sine', 0.1, 880);
    setTimeout(() => this.tone(660, 0.1, 'sine', 0.1, 1320), 60);
  },
  levelComplete() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.15, 'square', 0.1), i * 100);
    });
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.1), i * 150);
    });
  },
  menuSelect() {
    this.tone(660, 0.08, 'square', 0.08, 990);
  }
};
