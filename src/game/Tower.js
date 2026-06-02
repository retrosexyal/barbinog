import { normalizeDamageRange, rollDamage } from "../config/combat.js";
import { TOWERS_BY_ID } from "../config/towers.js";
import { distanceSq } from "../utils/math.js";

function cloneSpecial(special) {
  return {
    slowPercent: special.slowPercent || 0,
    slowDuration: special.slowDuration || 0,
    splashRadius: special.splashRadius || 0,
    poisonDps: special.poisonDps || 0,
    poisonDuration: special.poisonDuration || 0,
    chainTargets: special.chainTargets || 0,
    chainFalloff: special.chainFalloff || 0,
  };
}

function getBaseDamageRange(config) {
  const fallbackDamage = Number.isFinite(config.damage) ? config.damage : 0;
  return normalizeDamageRange(
    Number.isFinite(config.minDamage) ? config.minDamage : fallbackDamage,
    Number.isFinite(config.maxDamage) ? config.maxDamage : Number.isFinite(config.minDamage) ? config.minDamage : fallbackDamage,
  );
}

function addUpgradeDamage(range, upgrade) {
  if (Number.isFinite(upgrade.damage)) {
    range.min += upgrade.damage;
    range.max += upgrade.damage;
  }
  if (Number.isFinite(upgrade.minDamage)) range.min += upgrade.minDamage;
  if (Number.isFinite(upgrade.maxDamage)) range.max += upgrade.maxDamage;
  const normalized = normalizeDamageRange(range.min, range.max);
  range.min = normalized.min;
  range.max = normalized.max;
}

export class Tower {
  constructor(typeId, tileX, tileY, map) {
    this.config = TOWERS_BY_ID[typeId];
    this.id = this.config.id;
    this.name = this.config.name;
    this.tileX = tileX;
    this.tileY = tileY;
    const center = map.tileCenter(tileX, tileY);
    this.x = center.x;
    this.y = center.y;
    this.level = 0;
    this.spentGold = this.config.cost;
    this.cooldown = 0;
    this.targetMode = this.config.targetMode;
    this._targets = [];
    this.recalculateStats();
    this.buildTime = Number.isFinite(this.config.buildTime) ? Math.max(0, this.config.buildTime) : 0;
    this.buildRemaining = this.buildTime;
    this.buildProgress = this.buildTime > 0 ? 0 : 1;
    this.isBuilding = this.buildRemaining > 0;
  }

  recalculateStats() {
    this.range = this.config.range;
    const damageRange = getBaseDamageRange(this.config);
    this.minDamage = damageRange.min;
    this.maxDamage = damageRange.max;
    this.fireRate = this.config.fireRate;
    this.projectileSpeed = this.config.projectileSpeed;
    this.attackType = this.config.attackType;
    this.damageType = this.config.damageType;
    this.special = cloneSpecial(this.config.special);

    for (let i = 0; i < this.level; i += 1) {
      const upgrade = this.config.upgrades[i];
      this.range += upgrade.range || 0;
      addUpgradeDamage(damageRange, upgrade);
      this.minDamage = damageRange.min;
      this.maxDamage = damageRange.max;
      this.fireRate += upgrade.fireRate || 0;
      this.projectileSpeed += upgrade.projectileSpeed || 0;
      if (upgrade.special) {
        for (const key of Object.keys(upgrade.special)) {
          this.special[key] = (this.special[key] || 0) + upgrade.special[key];
        }
      }
    }
    this.rangeSq = this.range * this.range;
    this.damage = (this.minDamage + this.maxDamage) * 0.5;
  }

  update(dt, game) {
    if (this.updateConstruction(dt)) return;

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.cooldown > 0) return;
    }

    const target = this.findTarget(game);
    if (!target) return;

    this.attack(target, game);
    this.cooldown = 1 / this.fireRate;
  }

  updateConstruction(dt) {
    if (!this.isBuilding) return false;
    this.buildRemaining = Math.max(0, this.buildRemaining - dt);
    this.buildProgress = this.buildTime > 0 ? 1 - this.buildRemaining / this.buildTime : 1;
    if (this.buildRemaining > 0) return true;
    this.isBuilding = false;
    this.buildProgress = 1;
    return false;
  }

  findTarget(game) {
    const enemies = game.queryEnemiesInRange(this.x, this.y, this.rangeSq, this._targets);
    if (enemies.length === 0) return null;

    let best = enemies[0];
    let bestValue;
    if (this.targetMode === "nearest") {
      bestValue = distanceSq(this.x, this.y, best.x, best.y);
      for (let i = 1; i < enemies.length; i += 1) {
        const value = distanceSq(this.x, this.y, enemies[i].x, enemies[i].y);
        if (value < bestValue) {
          bestValue = value;
          best = enemies[i];
        }
      }
      return best;
    }

    if (this.targetMode === "strongest") {
      bestValue = best.hp;
      for (let i = 1; i < enemies.length; i += 1) {
        if (enemies[i].hp > bestValue) {
          bestValue = enemies[i].hp;
          best = enemies[i];
        }
      }
      return best;
    }

    bestValue = best.pathDistance;
    for (let i = 1; i < enemies.length; i += 1) {
      const value = enemies[i].pathDistance;
      if ((this.targetMode === "last" && value < bestValue) || (this.targetMode !== "last" && value > bestValue)) {
        bestValue = value;
        best = enemies[i];
      }
    }
    return best;
  }

  attack(target, game) {
    if (this.attackType === "chain") {
      this.chainAttack(target, game);
      return;
    }

    const damage = this.rollDamage();

    if (this.attackType === "instant") {
      target.applyDamage(damage, this.damageType, game, this);
      game.spawnEffect("beam", this.x, this.y, { x2: target.x, y2: target.y, color: this.config.color });
      return;
    }

    game.spawnProjectile(this.x, this.y, target, {
      projectileSpeed: this.projectileSpeed,
      damage,
      attackType: this.attackType,
      damageType: this.damageType,
      special: this.special,
      color: this.config.color,
      sourceTower: this,
      projectileSprite: this.config.projectileSprite,
    });
  }

  chainAttack(target, game) {
    let damage = this.rollDamage();
    const targets = game.queryEnemiesInRange(target.x, target.y, (this.special.splashRadius || this.range) ** 2, game.tempEnemyQuery);
    let hits = 0;
    for (let i = 0; i < targets.length && hits < this.special.chainTargets; i += 1) {
      const enemy = targets[i];
      if (!enemy.active) continue;
      enemy.applyDamage(damage, this.damageType, game, this);
      game.spawnEffect("beam", this.x, this.y, { x2: enemy.x, y2: enemy.y, color: this.config.color, duration: 0.08 });
      damage *= this.special.chainFalloff || 0.7;
      hits += 1;
    }
  }

  rollDamage() {
    return rollDamage(this.minDamage, this.maxDamage);
  }

  canUpgrade() {
    return !this.isBuilding && this.level < this.config.upgrades.length;
  }

  nextUpgrade() {
    return this.config.upgrades[this.level] || null;
  }

  upgrade() {
    if (this.isBuilding) return false;
    const upgrade = this.nextUpgrade();
    if (!upgrade) return false;
    this.level += 1;
    this.spentGold += upgrade.cost;
    this.recalculateStats();
    return true;
  }

  sellValue() {
    return Math.floor(this.spentGold * this.config.sellRatio);
  }
}
