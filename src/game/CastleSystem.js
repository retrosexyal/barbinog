import { CASTLE_TYPES, CASTLES_BY_ID, TALENTS_BY_ID } from "../config/castles.js";
import { distanceSq } from "../utils/math.js";

const MAX_CASTLE_LEVEL = 10;
const DEFAULT_CASTLE_ID = "human";

function xpToNextLevel(level) {
  return Math.floor(50 * Math.max(1, level) * 1.35);
}

function createRuntimeState(castleId) {
  const castle = CASTLES_BY_ID[castleId] || CASTLES_BY_ID[DEFAULT_CASTLE_ID];
  const resource = castle.uniqueResource || {};
  return {
    selectedCastleId: castle.id,
    level: 1,
    xp: 0,
    xpToNextLevel: 50,
    talentPoints: 0,
    unlockedTalentIds: [],
    activeCooldowns: {},
    uniqueResource: resource.key
      ? {
          key: resource.key,
          label: resource.label,
          amount: resource.initial || 0,
          max: resource.max || 0,
        }
      : null,
    temporaryEffects: [],
    activeZones: [],
    killCount: 0,
    finalTalentId: null,
  };
}

function makeBaseTowerModifiers() {
  return {
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    rangeMultiplier: 1,
    projectileSpeedMultiplier: 1,
    cooldownMultiplier: 1,
    specialAdditions: {},
  };
}

function findStrongestEnemy(enemies) {
  let best = null;
  let bestHp = -1;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (!enemy.active || enemy.hp <= bestHp) continue;
    best = enemy;
    bestHp = enemy.hp;
  }
  return best;
}

function getEffectValue(effect, key, fallback = 0) {
  return effect.stat === key ? effect.value : fallback;
}

export class CastleSystem {
  constructor(game) {
    this.game = game;
    this.state = null;
    this.selectedCastle = null;
    this.lastSelectedCastleId = DEFAULT_CASTLE_ID;
  }

  get selectableCastles() {
    return CASTLE_TYPES;
  }

  startRun(castleId) {
    const selectedId = CASTLES_BY_ID[castleId]?.id || DEFAULT_CASTLE_ID;
    this.state = createRuntimeState(selectedId);
    this.selectedCastle = CASTLES_BY_ID[selectedId];
    this.lastSelectedCastleId = selectedId;
    this.game.events.emit("castleChanged", this.state);
  }

  update(dt) {
    if (!this.state) return;
    this.updateCooldowns(dt);
    this.updateTemporaryEffects(dt);
    this.updateActiveZones(dt);
    this.applyBaseEmergencySlow();
  }

  updateCooldowns(dt) {
    const cooldowns = this.state.activeCooldowns;
    for (const abilityId of Object.keys(cooldowns)) {
      cooldowns[abilityId] = Math.max(0, cooldowns[abilityId] - dt);
    }
  }

  updateTemporaryEffects(dt) {
    const effects = this.state.temporaryEffects;
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      effects[i].remaining -= dt;
      if (effects[i].remaining <= 0) effects.splice(i, 1);
    }
  }

  updateActiveZones(dt) {
    const zones = this.state.activeZones;
    for (let i = zones.length - 1; i >= 0; i -= 1) {
      const zone = zones[i];
      zone.remaining -= dt;
      if (zone.remaining <= 0) {
        zones.splice(i, 1);
        continue;
      }
      const enemies = this.game.queryEnemiesInRange(zone.x, zone.y, zone.radius * zone.radius, []);
      for (let j = 0; j < enemies.length; j += 1) {
        const enemy = enemies[j];
        if (zone.dps) enemy.applyDamage(zone.dps * dt, zone.damageType || "chaos", this.game, null, false);
        if (enemy.active && zone.slowPercent) enemy.applySlow(zone.slowPercent, 0.35);
        if (enemy.active && zone.poisonDps) enemy.applyPoison(zone.poisonDps, 1);
      }
    }
  }

  applyBaseEmergencySlow() {
    const slow = this.getCastleStat("emergencySlowNearBase", 0);
    if (slow <= 0) return;
    const base = this.game.map.basePosition;
    const tile = this.game.map.tileSize;
    const x = (base.x + 0.5) * tile;
    const y = (base.y + 0.5) * tile;
    const radiusSq = 115 * 115;
    for (let i = 0; i < this.game.enemies.length; i += 1) {
      const enemy = this.game.enemies[i];
      if (enemy.active && distanceSq(x, y, enemy.x, enemy.y) <= radiusSq) {
        enemy.applySlow(slow, 0.3);
      }
    }
  }

  onEnemyKilled(enemy) {
    if (!this.state) return;
    this.state.killCount += 1;
    this.grantXp(enemy);
    this.grantUniqueResource(enemy);
    this.applyKillMechanics(enemy);
  }

  grantXp(enemy) {
    const baseXp = Math.max(1, Math.floor((enemy.rewardGold || 1) * 2));
    const gained = enemy.traits?.includes("boss") ? baseXp * 3 : baseXp;
    this.state.xp += gained;
    this.game.spawnEffect("text", enemy.x, enemy.y - enemy.radius - 14, {
      text: `+${gained} XP`,
      color: this.selectedCastle?.color || "#ffd564",
      vy: -18,
    });

    while (this.state.level < MAX_CASTLE_LEVEL && this.state.xp >= this.state.xpToNextLevel) {
      this.state.xp -= this.state.xpToNextLevel;
      this.state.level += 1;
      this.state.talentPoints += 1;
      this.state.xpToNextLevel = xpToNextLevel(this.state.level);
      this.game.spawnEffect("text", enemy.x, enemy.y - enemy.radius - 32, {
        text: `Castle Lv.${this.state.level}`,
        color: "#fff0b8",
        vy: -22,
      });
    }
    if (this.state.level >= MAX_CASTLE_LEVEL) {
      this.state.xp = Math.min(this.state.xp, this.state.xpToNextLevel);
    }
  }

  grantUniqueResource() {
    const resource = this.state.uniqueResource;
    if (!resource) return;
    this.addResource(1);
    const every = this.getCastleStat("extraSoulEveryKills", 0);
    if (every > 0 && this.state.killCount % every === 0) this.addResource(1);
  }

  addResource(amount) {
    const resource = this.state?.uniqueResource;
    if (!resource) return;
    resource.amount = Math.min(resource.max || Number.MAX_SAFE_INTEGER, resource.amount + amount);
  }

  spendResource(amount) {
    const resource = this.state?.uniqueResource;
    if (!amount) return true;
    if (!resource || resource.amount < amount) return false;
    resource.amount -= amount;
    return true;
  }

  applyKillMechanics(enemy) {
    if (this.selectedCastle?.id === "human") {
      this.applyHumanJudgementKill(enemy);
    }
    if (this.getCastleStat("poisonSpreadOnDeath", 0) > 0 && enemy.poisonTimer > 0) {
      this.spreadPoison(enemy);
    }
    if (enemy.judgementTimer > 0) {
      this.explodeJudgement(enemy);
    }
  }

  applyHumanJudgementKill() {
    const interval = Math.max(3, 6 + this.getCastleStat("judgementIntervalBonus", 0));
    if (this.state.killCount % interval !== 0) return;
    const target = findStrongestEnemy(this.game.enemies);
    if (!target) return;
    target.applyJudgement(
      0.16 + this.getCastleStat("judgementVulnerabilityBonus", 0),
      8 + this.getCastleStat("judgementDurationBonus", 0),
    );
    this.game.spawnEffect("ring", target.x, target.y, { radius: target.radius + 24, color: "#fff0a6", duration: 0.45 });
  }

  spreadPoison(enemy) {
    const targets = this.game.queryEnemiesInRange(enemy.x, enemy.y, 70 * 70, []);
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (target.active && target !== enemy) target.applyPoison(Math.max(3, enemy.poisonDps * 0.65), 3);
    }
  }

  explodeJudgement(enemy) {
    const radius = this.getCastleStat("judgementExplosionRadius", 0);
    const damage = this.getCastleStat("judgementExplosionDamage", 0);
    if (radius <= 0 || damage <= 0) return;
    const targets = this.game.queryEnemiesInRange(enemy.x, enemy.y, radius * radius, []);
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (target.active && target !== enemy) target.applyDamage(damage, "chaos", this.game, null);
    }
    this.game.spawnEffect("ring", enemy.x, enemy.y, { radius, color: "#ffe28f", duration: 0.4 });
  }

  getUnlockedTalentSet() {
    return new Set(this.state?.unlockedTalentIds || []);
  }

  canUnlockTalent(talentId) {
    if (!this.state) return false;
    const talentConfig = TALENTS_BY_ID[talentId];
    if (!talentConfig || this.state.unlockedTalentIds.includes(talentId)) return false;
    if (this.state.talentPoints < talentConfig.cost) return false;
    if (talentConfig.prerequisite && !this.state.unlockedTalentIds.includes(talentConfig.prerequisite)) return false;
    if (talentConfig.final && this.state.finalTalentId) return false;
    return this.selectedCastle?.branches.some((branchConfig) => branchConfig.id === talentConfig.branch) || false;
  }

  unlockTalent(talentId) {
    if (!this.canUnlockTalent(talentId)) return false;
    const talentConfig = TALENTS_BY_ID[talentId];
    this.state.talentPoints -= talentConfig.cost;
    this.state.unlockedTalentIds.push(talentId);
    if (talentConfig.final) this.state.finalTalentId = talentId;
    for (let i = 0; i < this.game.towers.length; i += 1) {
      this.game.towers[i].applyCastleModifiers(this.game);
    }
    this.game.events.emit("talentUnlocked", talentConfig);
    return true;
  }

  getTowerModifiers(tower) {
    const modifiers = makeBaseTowerModifiers();
    if (!this.state) return modifiers;
    this.applyTalentEffects((effect) => {
      if (effect.type === "tower" && Object.hasOwn(modifiers, effect.stat)) {
        modifiers[effect.stat] += effect.value;
      }
      if (effect.type === "towerSpecial") {
        modifiers.specialAdditions[effect.stat] = (modifiers.specialAdditions[effect.stat] || 0) + effect.value;
      }
    });

    if (this.getCastleStat("spiritDamageBonus", 0) > 0 && (tower.attackType === "chain" || tower.attackType === "instant")) {
      modifiers.damageMultiplier += this.getCastleStat("spiritDamageBonus", 0);
    }

    for (let i = 0; i < this.state.temporaryEffects.length; i += 1) {
      const effect = this.state.temporaryEffects[i];
      if (effect.type === "tower" && Object.hasOwn(modifiers, effect.stat)) {
        modifiers[effect.stat] += effect.value;
      }
    }

    modifiers.cooldownMultiplier = Math.max(0.2, modifiers.cooldownMultiplier);
    return modifiers;
  }

  getCastleStat(stat, fallback = 0) {
    let value = fallback;
    this.applyTalentEffects((effect) => {
      if (effect.type === "castle" && effect.stat === stat) value += effect.value;
    });
    return value;
  }

  getAbilityStat(abilityId, stat, fallback = 0) {
    let value = fallback;
    this.applyTalentEffects((effect) => {
      if (effect.type === "ability" && effect.abilityId === abilityId && effect.stat === stat) {
        value += effect.value;
      }
    });
    return value;
  }

  applyTalentEffects(callback) {
    if (!this.state) return;
    for (let i = 0; i < this.state.unlockedTalentIds.length; i += 1) {
      const talentConfig = TALENTS_BY_ID[this.state.unlockedTalentIds[i]];
      if (!talentConfig) continue;
      for (let j = 0; j < talentConfig.effects.length; j += 1) callback(talentConfig.effects[j]);
    }
  }

  getAbilityCooldown(abilityConfig) {
    const castleMultiplier = 1 + this.getCastleStat("cooldownMultiplierBonus", 0);
    const abilityMultiplier = 1 + this.getAbilityStat(abilityConfig.id, "cooldownMultiplier", 0);
    return Math.max(1, abilityConfig.cooldown * Math.max(0.2, castleMultiplier) * Math.max(0.2, abilityMultiplier));
  }

  getAbilityCost(abilityConfig) {
    return abilityConfig.soulsCost || 0;
  }

  canCastAbility(abilityId) {
    const abilityConfig = this.selectedCastle?.abilities.find((ability) => ability.id === abilityId);
    if (!abilityConfig || !this.state) return false;
    if ((this.state.activeCooldowns[abilityId] || 0) > 0) return false;
    const cost = this.getAbilityCost(abilityConfig);
    return !cost || (this.state.uniqueResource?.amount || 0) >= cost;
  }

  castAbility(abilityId, targetPoint = null) {
    const abilityConfig = this.selectedCastle?.abilities.find((ability) => ability.id === abilityId);
    if (!abilityConfig || !this.state) return { ok: false };
    if (abilityConfig.target === "area" && !targetPoint) {
      this.game.pendingAbilityId = abilityId;
      return { ok: true, targeting: true };
    }
    if (!this.canCastAbility(abilityId)) return { ok: false };
    if (!this.spendResource(this.getAbilityCost(abilityConfig))) return { ok: false };

    let result = false;
    if (abilityId === "heavenlyStrike") result = this.castHeavenlyStrike(abilityConfig);
    if (abilityId === "rallyHorn") result = this.castRallyHorn(abilityConfig);
    if (abilityId === "thornRain") result = this.castThornRain(abilityConfig, targetPoint);
    if (abilityId === "ancientRoots") result = this.castAncientRoots(abilityConfig, targetPoint);
    if (abilityId === "fingerOfDeath") result = this.castFingerOfDeath(abilityConfig);
    if (abilityId === "plagueCloud") result = this.castPlagueCloud(abilityConfig, targetPoint);

    if (!result) return { ok: false };
    this.state.activeCooldowns[abilityId] = this.getAbilityCooldown(abilityConfig);
    this.game.pendingAbilityId = null;
    return { ok: true };
  }

  castHeavenlyStrike(abilityConfig) {
    const target = findStrongestEnemy(this.game.enemies);
    if (!target) return false;
    const damage = (300 + this.state.level * 35) * (1 + this.getAbilityStat(abilityConfig.id, "damageMultiplier", 0));
    target.applyDamage(damage, abilityConfig.damageType, this.game, null);
    if (target.active && this.getAbilityStat(abilityConfig.id, "appliesJudgement", 0) > 0) {
      target.applyJudgement(0.16 + this.getCastleStat("judgementVulnerabilityBonus", 0), 8 + this.getCastleStat("judgementDurationBonus", 0));
    }
    this.game.spawnEffect("beam", target.x, target.y - 90, { x2: target.x, y2: target.y, color: "#fff0a6", duration: 0.18 });
    this.game.spawnEffect("ring", target.x, target.y, { radius: 58, color: "#ffe28f", duration: 0.38 });
    return true;
  }

  castRallyHorn(abilityConfig) {
    const duration = (abilityConfig.duration || 8) + this.getAbilityStat(abilityConfig.id, "durationBonus", 0);
    const fireRateBonus = 0.3 + this.getAbilityStat(abilityConfig.id, "fireRateBonus", 0);
    this.state.temporaryEffects.push({
      type: "tower",
      stat: "fireRateMultiplier",
      value: fireRateBonus,
      remaining: duration,
      label: abilityConfig.name,
    });
    this.game.spawnEffect("ring", this.game.map.width * this.game.map.tileSize * 0.5, this.game.map.height * this.game.map.tileSize * 0.5, {
      radius: 180,
      color: "#ffd564",
      duration: 0.6,
    });
    return true;
  }

  castThornRain(abilityConfig, targetPoint) {
    if (!targetPoint) return false;
    const radius = (abilityConfig.areaRadius || 90) + this.getAbilityStat(abilityConfig.id, "radiusBonus", 0);
    const damage = 80 + this.state.level * 15;
    const poisonDps = 10 + this.getAbilityStat(abilityConfig.id, "poisonDpsBonus", 0);
    const targets = this.game.queryEnemiesInRange(targetPoint.x, targetPoint.y, radius * radius, []);
    for (let i = 0; i < targets.length; i += 1) {
      const enemy = targets[i];
      enemy.applyDamage(damage, abilityConfig.damageType, this.game, null);
      if (enemy.active) enemy.applyPoison(poisonDps, 5);
    }
    this.game.spawnEffect("ring", targetPoint.x, targetPoint.y, { radius, color: "#84df79", duration: 0.45 });
    return true;
  }

  castAncientRoots(abilityConfig, targetPoint) {
    if (!targetPoint) return false;
    const radius = (abilityConfig.areaRadius || 100) + this.getAbilityStat(abilityConfig.id, "radiusBonus", 0);
    const rootDuration = 2 + this.getAbilityStat(abilityConfig.id, "rootDurationBonus", 0);
    const poisonDps = this.getAbilityStat(abilityConfig.id, "poisonDpsBonus", 0);
    const targets = this.game.queryEnemiesInRange(targetPoint.x, targetPoint.y, radius * radius, []);
    for (let i = 0; i < targets.length; i += 1) {
      const enemy = targets[i];
      enemy.applyRoot(rootDuration);
      enemy.applySlow(0.35, rootDuration + 4);
      if (poisonDps > 0) enemy.applyPoison(poisonDps, 5);
    }
    this.game.spawnEffect("ring", targetPoint.x, targetPoint.y, { radius, color: "#7bd06e", duration: 0.55 });
    return true;
  }

  castFingerOfDeath(abilityConfig) {
    const target = findStrongestEnemy(this.game.enemies);
    if (!target) return false;
    const damage = 250 + this.state.level * 45;
    target.applyDamage(damage, abilityConfig.damageType, this.game, null);
    const executeThreshold = this.getAbilityStat(abilityConfig.id, "executeThreshold", 0);
    if (target.active && executeThreshold > 0 && target.hp / target.maxHp <= executeThreshold) {
      target.applyDamage(target.maxHp, abilityConfig.damageType, this.game, null);
    }
    if (!target.active) this.addResource(2 + this.getAbilityStat(abilityConfig.id, "refundBonus", 0));
    this.game.spawnEffect("beam", target.x, target.y - 75, { x2: target.x, y2: target.y, color: "#b9a0ff", duration: 0.2 });
    return true;
  }

  castPlagueCloud(abilityConfig, targetPoint) {
    if (!targetPoint) return false;
    const radius = (abilityConfig.areaRadius || 100) + this.getAbilityStat(abilityConfig.id, "radiusBonus", 0);
    const duration = (abilityConfig.duration || 8) + this.getAbilityStat(abilityConfig.id, "durationBonus", 0);
    this.state.activeZones.push({
      type: "plague",
      x: targetPoint.x,
      y: targetPoint.y,
      radius,
      remaining: duration,
      dps: 18 + this.getAbilityStat(abilityConfig.id, "dpsBonus", 0),
      slowPercent: 0.25 + this.getAbilityStat(abilityConfig.id, "slowBonus", 0),
      damageType: "chaos",
    });
    this.game.spawnEffect("ring", targetPoint.x, targetPoint.y, { radius, color: "#9e83c9", duration: 0.6 });
    return true;
  }
}

export { MAX_CASTLE_LEVEL };
