import { getAttackArmorMultiplier, getAttackTypeColor } from "../config/combat.js";

export class Enemy {
  constructor() {
    this.active = false;
  }

  init(config, path, waveNumber) {
    const waveScale = 1 + Math.max(0, waveNumber - 1) * 0.12;
    this.active = true;
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.sprite = config.sprite;
    this.traits = config.traits;
    this.armorType = config.armorType || "unarmored";
    this.maxHp = Math.floor(config.hp * waveScale);
    this.hp = this.maxHp;
    this.baseSpeed = config.speed * (1 + Math.max(0, waveNumber - 1) * 0.012);
    this.armor = config.armor + Math.floor(waveNumber / 5);
    this.rewardGold = config.rewardGold + Math.floor(waveNumber * 0.75);
    this.damageToBase = config.damageToBase;
    this.radius = config.traits.includes("boss") ? 18 : config.traits.includes("swarm") ? 9 : 13;
    this.path = path;
    this.pathDistance = 0;
    this.pathProgress = 0;
    this.segmentIndex = 0;
    this.x = 0;
    this.y = 0;
    this.slowPercent = 0;
    this.slowTimer = 0;
    this.poisonTimer = 0;
    this.poisonDps = 0;
    this._sample = { x: 0, y: 0, segmentIndex: 0 };
    path.getStart(this._sample);
    this.x = this._sample.x;
    this.y = this._sample.y;
  }

  update(dt, game) {
    if (!this.active) return;

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.applyDamage(this.poisonDps * dt, "chaos", game, null, false);
      if (!this.active) return;
    }

    if (this.traits.includes("regen")) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.006 * dt);
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowPercent = 0;
    }

    const speedMultiplier = this.slowTimer > 0 ? 1 - this.slowPercent : 1;
    this.pathDistance += this.baseSpeed * speedMultiplier * dt;
    this.pathProgress = this.pathDistance / this.path.totalLength;

    if (this.pathDistance >= this.path.totalLength) {
      this.active = false;
      game.enemyReachedBase(this);
      return;
    }

    this.path.sample(this.pathDistance, this.segmentIndex, this._sample);
    this.segmentIndex = this._sample.segmentIndex;
    this.x = this._sample.x;
    this.y = this._sample.y;
  }

  applyDamage(amount, damageType, game, sourceTower = null, showText = true) {
    if (!this.active) return 0;
    const multiplier = getAttackArmorMultiplier(damageType, this.armorType);
    const finalDamage = Math.max(1, amount * multiplier - this.armor);
    this.hp -= finalDamage;

    if (showText && finalDamage >= 8) {
      game.spawnEffect("text", this.x, this.y - this.radius, {
        text: Math.floor(finalDamage).toString(),
        color: getAttackTypeColor(damageType),
      });
    }

    if (this.hp <= 0) {
      this.active = false;
      game.enemyKilled(this, sourceTower);
    }
    return finalDamage;
  }

  applySlow(percent, duration) {
    if (percent <= 0 || duration <= 0 || this.traits.includes("boss")) return;
    if (percent >= this.slowPercent || duration >= this.slowTimer) {
      this.slowPercent = Math.max(this.slowPercent, percent);
      this.slowTimer = Math.max(this.slowTimer, duration);
    }
  }

  applyPoison(dps, duration) {
    if (dps <= 0 || duration <= 0) return;
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonTimer = Math.max(this.poisonTimer, duration);
  }
}
