import { distanceSq, normalizeSafe } from "../utils/math.js";

export class Projectile {
  constructor() {
    this.active = false;
  }

  init(x, y, target, data) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.target = target;
    this.targetX = target.x;
    this.targetY = target.y;
    this.speed = data.projectileSpeed;
    this.damage = data.damage;
    this.attackType = data.attackType;
    this.damageType = data.damageType;
    this.special = data.special;
    this.color = data.color;
    this.sourceTower = data.sourceTower;
    this.isCritical = !!data.isCritical;
    this.radius = data.attackType === "aoe" ? 6 : 4;
    this.sprite = data.projectileSprite || null;
    const initialDir = normalizeSafe(target.x - x, target.y - y);
    this.angle = Math.atan2(initialDir.y, initialDir.x);
  }

  update(dt, game) {
    if (!this.active) return;
    if (!this.target?.active) {
      this.active = false;
      return;
    }

    this.targetX = this.target.x;
    this.targetY = this.target.y;
    const hitDistance = this.target.radius + this.radius + 4;
    if (distanceSq(this.x, this.y, this.targetX, this.targetY) <= hitDistance * hitDistance) {
      this.resolveHit(game);
      this.active = false;
      return;
    }

    const dir = normalizeSafe(this.targetX - this.x, this.targetY - this.y);
    this.angle = Math.atan2(dir.y, dir.x);
    const travel = this.speed * dt;
    this.x += dir.x * travel;
    this.y += dir.y * travel;
  }

  resolveHit(game) {
    const splashRadius = this.special.splashRadius || 0;
    if ((this.attackType === "aoe" || this.attackType === "slow") && splashRadius > 0) {
      const targets = game.queryEnemiesInRange(this.target.x, this.target.y, splashRadius * splashRadius, game.tempEnemyQuery);
      for (let i = 0; i < targets.length; i += 1) {
        const enemy = targets[i];
        enemy.applyDamage(enemy === this.target ? this.damage : this.damage * 0.55, this.damageType, game, this.sourceTower);
        if (this.isCritical && enemy === this.target) this.spawnCritText(enemy, game);
        if (this.attackType === "slow") {
          enemy.applySlow(this.special.slowPercent, this.special.slowDuration);
        }
        if (this.special.poisonDps) {
          enemy.applyPoison(this.special.poisonDps, this.special.poisonDuration);
        }
      }
      game.spawnEffect("ring", this.target.x, this.target.y, {
        radius: splashRadius,
        color: this.attackType === "slow" ? "#8fe4ff" : "#f0b35d",
      });
      return;
    }

    this.target.applyDamage(this.damage, this.damageType, game, this.sourceTower);
    if (this.isCritical) this.spawnCritText(this.target, game);
    if (this.attackType === "slow") {
      this.target.applySlow(this.special.slowPercent, this.special.slowDuration);
    }
    if (this.target.active && this.special.poisonDps) {
      this.target.applyPoison(this.special.poisonDps, this.special.poisonDuration);
    }
    if (this.target.active && this.special.slowPercent && this.attackType !== "slow") {
      this.target.applySlow(this.special.slowPercent, this.special.slowDuration || 1);
    }
    const curse = game.castleSystem?.getCastleStat("curseVulnerability", 0) || 0;
    if (this.target.active && curse > 0 && this.target.hp / this.target.maxHp <= 0.55) {
      this.target.applyVulnerability(curse, 3);
    }
  }

  spawnCritText(target, game) {
    game.spawnEffect("text", target.x, target.y - target.radius - 18, {
      text: "CRIT",
      color: "#fff0a6",
      vy: -20,
    });
  }
}
