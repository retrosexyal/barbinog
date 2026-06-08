import { MAP_CONFIG } from "../config/map.js";
import { ENEMY_TYPES } from "../config/enemies.js";
import { NEXT_WAVE_AUTO_START_DELAY, WAVES } from "../config/waves.js";
import { TOWER_TYPES, TOWERS_BY_ID } from "../config/towers.js";
import { YandexSDK } from "../platform/YandexSDK.js";
import { Storage } from "../platform/Storage.js";
import { Leaderboard } from "../platform/Leaderboard.js";
import { EventBus } from "../utils/EventBus.js";
import { ObjectPool } from "../utils/ObjectPool.js";
import { distanceSq } from "../utils/math.js";
import { Camera } from "./Camera.js";
import { CastleSystem } from "./CastleSystem.js";
import { Effect } from "./Effects.js";
import { Enemy } from "./Enemy.js";
import { GameMap } from "./Map.js";
import { Input } from "./Input.js";
import { Loop } from "./Loop.js";
import { Path } from "./Path.js";
import { Projectile } from "./Projectile.js";
import { Renderer } from "./Renderer.js";
import { Tower } from "./Tower.js";
import { UI } from "./UI.js";
import { WaveManager } from "./WaveManager.js";

const START_GOLD = 500;
const START_LIVES = 20;
const SPATIAL_CELL = 128;

export class Game {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.debugPerf = options.debugPerf || false;
    this.state = "boot";
    this.previousState = "menu";
    this.events = new EventBus();
    this.map = new GameMap(MAP_CONFIG);
    this.path = new Path(this.map);
    this.camera = new Camera(this.map);
    this.ui = new UI();
    this.renderer = new Renderer(canvas, this.camera);
    this.yandex = new YandexSDK();
    this.storage = new Storage(this.yandex);
    this.leaderboard = new Leaderboard(this.yandex);
    this.castleSystem = new CastleSystem(this);
    this.waveManager = new WaveManager(WAVES, this);
    this.input = null;
    this.loop = new Loop((dt) => this.update(dt), () => this.render());

    this.enemyPool = new ObjectPool(() => new Enemy(), null, 140);
    this.projectilePool = new ObjectPool(() => new Projectile(), null, 260);
    this.effectPool = new ObjectPool(() => new Effect(), null, 90);

    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.towers = [];
    this.spatialBuckets = new Map();
    this.tempEnemyQuery = [];

    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.completedWave = 0;
    this.totalWaves = WAVES.length;
    this.kills = 0;
    this.score = 0;
    this.bestScore = 0;
    this.baseTotalKills = 0;
    this.unlockedTowers = Object.keys(TOWERS_BY_ID);
    this.selectedTowerType = null;
    this.selectedTower = null;
    this.selectedEnemy = null;
    this.selectedCastle = false;
    this.towerDropdownOpen = false;
    this.actionsMenuOpen = false;
    this.abilityMenuOpen = false;
    this.hoverTile = null;
    this.castleSelectCompletedWave = 0;
    this.talentPanelOpen = false;
    this.pendingAbilityId = null;
    this.nextWaveAutoStartDelay = NEXT_WAVE_AUTO_START_DELAY;
    this.nextWaveCountdown = null;
    this.usedContinue = false;
    this.savedData = {};
    this.leaderboardEntries = [];
    this.leaderboardNeedsAuth = false;
    this.fps = 0;
    this._fpsTimer = 0;
    this._fpsFrames = 0;
    this._lastAdWave = 0;
  }

  async init() {
    this.state = "loading";
    await this.yandex.init();
    await Promise.all([
      this.renderer.loadMapArtSprites(),
      this.renderer.loadEnemySprites(ENEMY_TYPES),
      this.renderer.loadTowerSprites(TOWER_TYPES),
    ]);
    this.savedData = await this.storage.init();
    this.leaderboard = new Leaderboard(this.yandex);
    this.bestScore = this.savedData.bestScore || 0;
    this.baseTotalKills = this.savedData.totalKills || 0;
    this.unlockedTowers = this.savedData.unlockedTowers || this.unlockedTowers;
    this.castleSystem.lastSelectedCastleId = this.savedData.lastSelectedCastleId || this.castleSystem.lastSelectedCastleId;
    this.input = new Input(this.canvas, this);
    this.yandex.onPauseResume((paused) => {
      if (paused) this.pauseFromSystem();
      else if (this.state === "paused") this.togglePause();
    });
    this.resetRun(0);
    this.state = "menu";
    this.yandex.ready();
  }

  start() {
    this.loop.start();
  }

  update(dt) {
    this.storage.update(dt);
    this._fpsTimer += dt;
    this._fpsFrames += 1;
    if (this._fpsTimer >= 0.5) {
      this.fps = this._fpsFrames / this._fpsTimer;
      this._fpsTimer = 0;
      this._fpsFrames = 0;
    }

    if (this.state === "gameOver" || this.state === "victory") {
      if (this.selectedEnemy && !this.selectedEnemy.active) this.selectedEnemy = null;
      this.updateEnemyAnimations(dt, "idle");
      this.updateEffects(dt);
      return;
    }

    if (this.isRunState() && this.state !== "paused") {
      this.castleSystem.update(dt);
    }

    if (!this.isRunState() || this.state === "paused" || this.state === "waveComplete") {
      if (this.state === "paused") this.updateEnemyAnimations(dt, "idle");
      if (this.state === "waveComplete") {
        this.updateTowerConstruction(dt);
        this.updateNextWaveCountdown(dt);
      }
      this.updateEffects(dt);
      return;
    }

    this.waveManager.update(dt);
    this.updateEnemies(dt);
    if (this.selectedEnemy && !this.selectedEnemy.active) this.selectedEnemy = null;
    this.rebuildSpatialGrid();
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);

    if (this.waveManager.checkCompletion(this.enemies.length)) {
      this.onWaveCompleted(this.waveManager.completedWave);
    }
  }

  render() {
    this.renderer.render(this);
  }

  isRunState() {
    return this.state === "playing" || this.state === "paused" || this.state === "waveComplete" || this.state === "gameOver" || this.state === "victory";
  }

  resetRun(completedWave = 0) {
    this.gold = START_GOLD + completedWave * 60;
    this.lives = START_LIVES;
    this.completedWave = completedWave;
    this.kills = 0;
    this.score = 0;
    this.usedContinue = false;
    this.selectedTower = null;
    this.selectedEnemy = null;
    this.selectedCastle = false;
    this.selectedTowerType = null;
    this.towerDropdownOpen = false;
    this.actionsMenuOpen = false;
    this.abilityMenuOpen = false;
    this.hoverTile = null;
    this.nextWaveCountdown = null;
    this.talentPanelOpen = false;
    this.pendingAbilityId = null;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.effects.length = 0;
    this.towers.length = 0;
    this.map.resetOccupancy();
    this.waveManager.reset(completedWave);
    this.recalculateScore();
  }

  startNewGame() {
    this.openCastleSelect(0);
  }

  loadSavedGame() {
    this.openCastleSelect(this.savedData.completedWave || 0);
  }

  openCastleSelect(completedWave = 0) {
    this.castleSelectCompletedWave = Math.max(0, completedWave);
    this.resetRun(this.castleSelectCompletedWave);
    this.state = "castleSelect";
    this.yandex.gameplayStop();
  }

  selectCastle(castleId) {
    this.resetRun(this.castleSelectCompletedWave || 0);
    this.castleSystem.startRun(castleId);
    this.state = "playing";
    this.yandex.gameplayStart();
    this.saveProgress();
  }

  startWave() {
    if (this.state === "menu" || this.state === "castleSelect" || this.state === "paused" || this.state === "gameOver" || this.state === "victory" || this.waveManager.running) return;
    if (this.state === "waveComplete") this.state = "playing";
    if (!this.waveManager.hasMoreWaves()) {
      this.victory();
      return;
    }
    if (this.waveManager.startNextWave()) {
      this.nextWaveCountdown = null;
      this.state = "playing";
      this.yandex.gameplayStart();
    }
  }

  startNextWaveCountdown() {
    if (this.state !== "waveComplete" || !this.waveManager.hasMoreWaves()) {
      this.nextWaveCountdown = null;
      return;
    }
    this.nextWaveCountdown = Math.max(0, this.nextWaveAutoStartDelay);
  }

  updateNextWaveCountdown(dt) {
    if (this.nextWaveCountdown == null || !this.waveManager.hasMoreWaves()) return;
    this.nextWaveCountdown = Math.max(0, this.nextWaveCountdown - dt);
    if (this.nextWaveCountdown <= 0) {
      this.startWave();
    }
  }

  togglePause() {
    if (this.state === "menu" || this.state === "castleSelect" || this.state === "gameOver" || this.state === "victory" || this.state === "leaderboard") return;
    if (this.state === "paused") {
      this.state = this.previousState === "paused" ? "playing" : this.previousState;
      this.yandex.gameplayStart();
    } else {
      this.previousState = this.state;
      this.state = "paused";
      this.yandex.gameplayStop();
    }
  }

  pauseFromSystem() {
    if (this.state === "playing") {
      this.previousState = this.state;
      this.state = "paused";
      this.yandex.gameplayStop();
    }
  }

  handleUIAction(action, meta) {
    if (action === "newGame") this.startNewGame();
    else if (action === "loadGame") this.loadSavedGame();
    else if (action === "selectCastle") this.selectCastle(meta.castleId);
    else if (action === "selectCastleEntity") this.selectCastleEntity();
    else if (action === "startWave") {
      this.actionsMenuOpen = false;
      this.abilityMenuOpen = false;
      this.startWave();
    } else if (action === "pause") {
      this.actionsMenuOpen = false;
      this.abilityMenuOpen = false;
      this.togglePause();
    }
    else if (action === "talents") this.talentPanelOpen = true;
    else if (action === "closeTalents") {
      this.ui.closeTalentConfirm();
      this.talentPanelOpen = false;
    }
    else if (action === "selectTalentTab") this.ui.activeTalentTabIndex = meta.index;
    else if (action === "unlockTalent") this.ui.openTalentConfirm(meta.talentId);
    else if (action === "cancelTalentConfirm") this.ui.closeTalentConfirm();
    else if (action === "confirmTalentUnlock") {
      if (this.castleSystem.unlockTalent(meta.talentId)) this.ui.closeTalentConfirm();
    }
    else if (action === "noop") {
      return;
    }
    else if (action === "activeAbility") {
      this.abilityMenuOpen = false;
      this.useCastleAbility(meta.abilityId);
    }
    else if (action === "cancelAbility") this.pendingAbilityId = null;
    else if (action === "toggleTowerDropdown") {
      this.towerDropdownOpen = !this.towerDropdownOpen;
      this.actionsMenuOpen = false;
      this.abilityMenuOpen = false;
    } else if (action === "toggleActionsMenu") {
      this.actionsMenuOpen = !this.actionsMenuOpen;
      this.towerDropdownOpen = false;
      this.abilityMenuOpen = false;
    } else if (action === "toggleAbilityMenu") {
      this.abilityMenuOpen = !this.abilityMenuOpen;
      this.actionsMenuOpen = false;
      this.towerDropdownOpen = false;
    }
    else if (action === "selectTowerType") {
      this.selectTowerType(meta.typeId);
    } else if (action === "upgradeTower") this.upgradeSelectedTower();
    else if (action === "sellTower") this.sellSelectedTower();
    else if (action === "leaderboard") {
      this.actionsMenuOpen = false;
      this.abilityMenuOpen = false;
      this.openLeaderboard();
    }
    else if (action === "closeLeaderboard") this.closeLeaderboard();
    else if (action === "authLeaderboard") this.authForLeaderboard();
    else if (action === "rewardGold") this.rewardGoldAd();
    else if (action === "rewardContinue") this.rewardContinue();
  }

  handleMapClick(tileX, tileY, worldX = null, worldY = null) {
    if (this.pendingAbilityId && Number.isFinite(worldX) && Number.isFinite(worldY)) {
      this.castleSystem.castAbility(this.pendingAbilityId, { x: worldX, y: worldY });
      return;
    }

    const towerAtPointer =
      Number.isFinite(worldX) && Number.isFinite(worldY) ? this.renderer.hitTestTowerAt(this.towers, worldX, worldY) : null;
    const tower = towerAtPointer || this.getTowerAtTile(tileX, tileY);
    if (tower) {
      this.selectedTower = tower;
      this.selectedEnemy = null;
      this.selectedCastle = false;
      this.selectedTowerType = null;
      this.abilityMenuOpen = false;
      this.events.emit("towerSelected", tower);
      return;
    }

    const enemy =
      Number.isFinite(worldX) && Number.isFinite(worldY) ? this.renderer.hitTestEnemyAt(this.enemies, worldX, worldY) : null;
    if (enemy) {
      this.selectedEnemy = enemy;
      this.selectedCastle = false;
      this.selectedTower = null;
      this.selectedTowerType = null;
      this.towerDropdownOpen = false;
      this.abilityMenuOpen = false;
      return;
    }

    if (Number.isFinite(worldX) && Number.isFinite(worldY) && this.hitTestCastle(worldX, worldY)) {
      this.selectCastleEntity();
      return;
    }

    if (this.selectedTowerType) {
      if (this.map.canBuildAt(tileX, tileY)) {
        this.buildTower(this.selectedTowerType, tileX, tileY);
      } else {
        this.selectedTowerType = null;
      }
    }
  }

  useCastleAbility(abilityId) {
    if (!this.isRunState() || this.state === "paused" || this.state === "gameOver" || this.state === "victory") return false;
    const result = this.castleSystem.castAbility(abilityId);
    if (!result.ok && this.pendingAbilityId === abilityId) this.pendingAbilityId = null;
    return result.ok;
  }

  selectTowerType(typeId) {
    const config = TOWERS_BY_ID[typeId];
    if (!config || !this.unlockedTowers.includes(typeId) || this.gold < config.cost) {
      return false;
    }
    this.selectedTowerType = typeId;
    this.selectedTower = null;
    this.selectedEnemy = null;
    this.selectedCastle = false;
    this.towerDropdownOpen = false;
    this.abilityMenuOpen = false;
    return true;
  }

  selectCastleEntity() {
    if (!this.castleSystem?.state) return false;
    this.selectedCastle = true;
    this.selectedTower = null;
    this.selectedTowerType = null;
    this.selectedEnemy = null;
    this.towerDropdownOpen = false;
    this.abilityMenuOpen = false;
    return true;
  }

  hitTestCastle(worldX, worldY) {
    const center = this.map.tileCenter(this.map.basePosition.x, this.map.basePosition.y);
    const x = center.x + this.map.tileSize * 0.12;
    const y = center.y + this.map.tileSize * 0.82;
    const width = 170;
    const height = 199;
    const top = y - height * 0.9;
    return worldX >= x - width * 0.5 && worldX <= x + width * 0.5 && worldY >= top && worldY <= y + height * 0.1;
  }

  buildTower(typeId, tileX, tileY) {
    const config = TOWERS_BY_ID[typeId];
    if (!config || this.gold < config.cost || !this.map.canBuildAt(tileX, tileY)) return false;
    this.gold -= config.cost;
    const tower = new Tower(typeId, tileX, tileY, this.map);
    this.towers.push(tower);
    this.map.occupy(tileX, tileY);
    this.selectedTower = tower;
    this.selectedEnemy = null;
    this.selectedCastle = false;
    this.selectedTowerType = null;
    this.recalculateScore();
    this.events.emit("goldChanged", this.gold);
    this.events.emit("towerBuilt", tower);
    this.saveProgress();
    return true;
  }

  upgradeSelectedTower() {
    const tower = this.selectedTower;
    const upgrade = tower?.nextUpgrade();
    if (!tower || tower.isBuilding || !upgrade || this.gold < upgrade.cost) return false;
    this.gold -= upgrade.cost;
    tower.upgrade();
    this.recalculateScore();
    this.events.emit("towerUpgraded", tower);
    this.events.emit("goldChanged", this.gold);
    this.saveProgress();
    return true;
  }

  sellSelectedTower() {
    const tower = this.selectedTower;
    if (!tower) return false;
    const index = this.towers.indexOf(tower);
    if (index >= 0) this.towers.splice(index, 1);
    this.map.unoccupy(tower.tileX, tower.tileY);
    this.gold += tower.sellValue();
    this.selectedTower = null;
    this.selectedTowerType = tower.id;
    this.recalculateScore();
    this.events.emit("goldChanged", this.gold);
    this.saveProgress();
    return true;
  }

  getTowerAtTile(tileX, tileY) {
    for (let i = 0; i < this.towers.length; i += 1) {
      const tower = this.towers[i];
      if (tower.tileX === tileX && tower.tileY === tileY) return tower;
    }
    return null;
  }

  spawnEnemy(enemyId, waveNumber) {
    const config = ENEMY_TYPES[enemyId];
    if (!config) return;
    const enemy = this.enemyPool.acquire();
    enemy.init(config, this.path, waveNumber);
    this.enemies.push(enemy);
  }

  spawnProjectile(x, y, target, data) {
    const projectile = this.projectilePool.acquire();
    projectile.init(x, y, target, data);
    this.projectiles.push(projectile);
  }

  spawnEffect(type, x, y, data = {}) {
    const effect = this.effectPool.acquire();
    effect.init(type, x, y, data);
    this.effects.push(effect);
  }

  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.update(dt, this);
      if (!enemy.active) {
        if (this.selectedEnemy === enemy) this.selectedEnemy = null;
        this.enemyPool.release(enemy);
        this.enemies[i] = this.enemies[this.enemies.length - 1];
        this.enemies.pop();
      }
    }
  }

  updateEnemyAnimations(dt, state) {
    for (let i = 0; i < this.enemies.length; i += 1) {
      this.enemies[i].updateAnimation(dt, state);
    }
  }

  updateTowers(dt) {
    for (let i = 0; i < this.towers.length; i += 1) {
      this.towers[i].update(dt, this);
    }
  }

  updateTowerConstruction(dt) {
    for (let i = 0; i < this.towers.length; i += 1) {
      this.towers[i].updateConstruction(dt);
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.update(dt, this);
      if (!projectile.active) {
        this.projectilePool.release(projectile);
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      }
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.update(dt);
      if (!effect.active) {
        this.effectPool.release(effect);
        this.effects[i] = this.effects[this.effects.length - 1];
        this.effects.pop();
      }
    }
  }

  rebuildSpatialGrid() {
    for (const bucket of this.spatialBuckets.values()) bucket.length = 0;
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      const bx = Math.floor(enemy.x / SPATIAL_CELL);
      const by = Math.floor(enemy.y / SPATIAL_CELL);
      const key = `${bx},${by}`;
      let bucket = this.spatialBuckets.get(key);
      if (!bucket) {
        bucket = [];
        this.spatialBuckets.set(key, bucket);
      }
      bucket.push(enemy);
    }
  }

  queryEnemiesInRange(x, y, rangeSq, out) {
    out.length = 0;
    const range = Math.ceil(Math.sqrt(rangeSq));
    const minX = Math.floor((x - range) / SPATIAL_CELL);
    const maxX = Math.floor((x + range) / SPATIAL_CELL);
    const minY = Math.floor((y - range) / SPATIAL_CELL);
    const maxY = Math.floor((y + range) / SPATIAL_CELL);
    for (let by = minY; by <= maxY; by += 1) {
      for (let bx = minX; bx <= maxX; bx += 1) {
        const bucket = this.spatialBuckets.get(`${bx},${by}`);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const enemy = bucket[i];
          if (enemy.active && distanceSq(x, y, enemy.x, enemy.y) <= rangeSq) {
            out.push(enemy);
          }
        }
      }
    }
    return out;
  }

  enemyKilled(enemy, tower) {
    this.gold += enemy.rewardGold;
    this.kills += 1;
    this.castleSystem.onEnemyKilled(enemy, tower);
    this.spawnEffect("ring", enemy.x, enemy.y, { radius: enemy.radius + 12, color: "#ffd564", duration: 0.25 });
    this.recalculateScore();
    this.events.emit("enemyKilled", { enemy, tower });
    this.events.emit("goldChanged", this.gold);
  }

  enemyReachedBase(enemy) {
    const reduction = this.castleSystem.getCastleStat("baseDamageReduction", 0);
    const damageToBase = Math.max(1, Math.ceil(enemy.damageToBase * (1 - reduction)));
    this.lives = Math.max(0, this.lives - damageToBase);
    this.spawnEffect("ring", enemy.x, enemy.y, { radius: 42, color: "#ef6158", duration: 0.45 });
    this.recalculateScore();
    this.events.emit("livesChanged", this.lives);
    if (this.lives <= 0) this.gameOver();
  }

  onWaveCompleted() {
    const wave = WAVES[this.completedWave];
    this.completedWave = this.waveManager.completedWave;
    this.gold += wave?.rewardOnComplete || 0;
    this.recalculateScore();
    this.events.emit("waveCompleted", this.completedWave);
    this.saveProgress(true);

    if (!this.waveManager.hasMoreWaves()) {
      this.victory();
      return;
    }

    this.state = "waveComplete";
    if (this.completedWave > 0 && this.completedWave % 4 === 0 && this._lastAdWave !== this.completedWave) {
      this._lastAdWave = this.completedWave;
      this.nextWaveCountdown = null;
      this.yandex.showFullscreenAd().finally(() => this.startNextWaveCountdown());
    } else {
      this.startNextWaveCountdown();
    }
  }

  recalculateScore() {
    this.score = this.completedWave * 1000 + this.kills * 10 + this.lives * 50 + this.gold;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }
    this.events.emit("scoreChanged", this.score);
  }

  saveProgress(immediate = false) {
    this.storage.queueSave({
      bestScore: this.bestScore,
      completedWave: this.completedWave,
      unlockedTowers: this.unlockedTowers,
      totalKills: this.baseTotalKills + this.kills,
      lastSelectedCastleId: this.castleSystem.lastSelectedCastleId,
      castleMastery: this.savedData.castleMastery || {},
      unlockedCastles: this.savedData.unlockedCastles || ["human", "elf", "undead"],
    });
    if (immediate) this.storage.flush();
    if (this.score >= this.bestScore) this.leaderboard.submitScore(this.score);
  }

  gameOver() {
    if (this.state === "gameOver") return;
    this.state = "gameOver";
    this.yandex.gameplayStop();
    this.recalculateScore();
    this.saveProgress(true);
    this.leaderboard.submitScore(this.score);
    this.events.emit("gameOver", this.score);
    this.yandex.showFullscreenAd();
  }

  victory() {
    this.state = "victory";
    this.yandex.gameplayStop();
    this.recalculateScore();
    this.saveProgress(true);
    this.leaderboard.submitScore(this.score);
  }

  async rewardGoldAd() {
    if (!this.isRunState() || this.state === "gameOver" || this.state === "victory") return;
    const previousState = this.state;
    this.state = "paused";
    const rewarded = await this.yandex.showRewardedAd();
    this.gold += rewarded ? 100 : 0;
    if (!this.yandex.isAvailable()) this.gold += 100;
    this.recalculateScore();
    this.saveProgress();
    this.state = previousState === "paused" ? "playing" : previousState;
  }

  async rewardContinue() {
    if (this.usedContinue || this.state !== "gameOver") return;
    const rewarded = await this.yandex.showRewardedAd();
    if (rewarded || !this.yandex.isAvailable()) {
      this.usedContinue = true;
      this.lives = 5;
      this.state = "playing";
      this.yandex.gameplayStart();
    }
  }

  async openLeaderboard() {
    this.previousState = this.state;
    this.state = "leaderboard";
    const player = await this.yandex.getPlayer();
    const mode = typeof player?.getMode === "function" ? player.getMode() : "full";
    this.leaderboardNeedsAuth = this.yandex.isAvailable() && (!player || mode === "lite");
    this.leaderboardEntries = await this.leaderboard.getTop(10);
  }

  closeLeaderboard() {
    this.state = this.previousState && this.previousState !== "leaderboard" ? this.previousState : "menu";
  }

  async authForLeaderboard() {
    await this.yandex.requestAuth();
    this.leaderboardNeedsAuth = false;
    this.leaderboardEntries = await this.leaderboard.getTop(10);
  }
}
