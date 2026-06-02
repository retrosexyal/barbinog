export class WaveManager {
  constructor(waves, game) {
    this.waves = waves;
    this.game = game;
    this.reset(0);
  }

  reset(completedWave = 0) {
    this.completedWave = completedWave;
    this.nextWaveIndex = Math.min(completedWave, this.waves.length);
    this.currentWave = null;
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.spawnTimer = 0;
    this.groupDelay = 0;
    this.running = false;
    this.spawningComplete = false;
  }

  startNextWave() {
    if (this.running || this.nextWaveIndex >= this.waves.length) return false;
    this.currentWave = this.waves[this.nextWaveIndex];
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.spawnTimer = 0;
    this.groupDelay = 0;
    this.running = true;
    this.spawningComplete = false;
    this.game.events.emit("waveStarted", this.currentWave.wave);
    return true;
  }

  update(dt) {
    if (!this.running || this.spawningComplete) return;

    if (this.groupDelay > 0) {
      this.groupDelay -= dt;
      return;
    }

    const group = this.currentWave.groups[this.groupIndex];
    if (!group) {
      this.spawningComplete = true;
      return;
    }

    this.spawnTimer -= dt;
    while (this.spawnTimer <= 0 && this.spawnedInGroup < group.count) {
      this.game.spawnEnemy(group.enemyId, this.currentWave.wave);
      this.spawnedInGroup += 1;
      this.spawnTimer += group.spawnInterval;
    }

    if (this.spawnedInGroup >= group.count) {
      this.groupDelay = group.delayBeforeNextGroup || 0;
      this.groupIndex += 1;
      this.spawnedInGroup = 0;
      this.spawnTimer = 0;
      if (this.groupIndex >= this.currentWave.groups.length) {
        this.spawningComplete = true;
      }
    }
  }

  checkCompletion(activeEnemyCount) {
    if (!this.running || !this.spawningComplete || activeEnemyCount > 0) return false;
    const completed = this.currentWave;
    this.running = false;
    this.completedWave = completed.wave;
    this.nextWaveIndex += 1;
    this.game.events.emit("waveCompleted", completed);
    return true;
  }

  hasMoreWaves() {
    return this.nextWaveIndex < this.waves.length;
  }
}
