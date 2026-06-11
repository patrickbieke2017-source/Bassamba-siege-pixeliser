// Generates wave/level configuration. Difficulty and enemy variety scale with level.
const Levels = {
  getConfig(levelNum) {
    return {
      totalEnemies: 5 + (levelNum - 1) * 2,
      speedMultiplier: 1 + (levelNum - 1) * 0.07,
      spawnInterval: Math.max(0.4, 1.4 - (levelNum - 1) * 0.07),
      enemyWeights: this.getEnemyWeights(levelNum)
    };
  },

  // New enemy types are introduced gradually as the player levels up.
  getEnemyWeights(levelNum) {
    const weights = { chaser: 10 };
    if (levelNum >= 2) weights.swarmer = Math.min(8, (levelNum - 1) * 2);
    if (levelNum >= 3) weights.shooter = Math.min(7, (levelNum - 2) * 2);
    if (levelNum >= 5) weights.tank = Math.min(5, levelNum - 4);
    return weights;
  },

  pickEnemyType(config) {
    const weights = config.enemyWeights;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [type, weight] of Object.entries(weights)) {
      if (roll < weight) return type;
      roll -= weight;
    }
    return 'chaser';
  }
};
