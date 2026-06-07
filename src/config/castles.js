const DEFAULT_RESOURCE = Object.freeze({ key: null, label: "", initial: 0, max: 0 });

function talent(id, branch, name, description, effects, options = {}) {
  return Object.freeze({
    id,
    branch,
    name,
    description,
    cost: options.cost || 1,
    prerequisite: options.prerequisite || null,
    final: options.final || false,
    effects: Object.freeze(effects),
  });
}

function tower(stat, value) {
  return { type: "tower", stat, value };
}

function towerSpecial(stat, value) {
  return { type: "towerSpecial", stat, value };
}

function castle(stat, value) {
  return { type: "castle", stat, value };
}

function ability(abilityId, stat, value) {
  return { type: "ability", abilityId, stat, value };
}

function branch(id, name, talents) {
  return Object.freeze({ id, name, talents: Object.freeze(talents) });
}

export const CASTLE_TYPES = Object.freeze([
  {
    id: "human",
    name: "Human Citadel",
    title: "Citadel of the Order",
    icon: "H",
    color: "#d6b36c",
    description: "Balanced tower buffs, Judgement marks, and defensive control.",
    strength: "Reliable damage and broad tower support.",
    weakness: "Needs kills to build momentum.",
    uniqueMechanic: "Every few kills marks the strongest enemy with Judgement. Marked enemies take increased damage.",
    uniqueResource: DEFAULT_RESOURCE,
    abilities: Object.freeze([
      {
        id: "heavenlyStrike",
        name: "Heavenly Strike",
        icon: "S",
        cooldown: 45,
        target: "strongest",
        damageType: "chaos",
        description: "Hits the enemy with the highest current HP.",
      },
      {
        id: "rallyHorn",
        name: "Rally Horn",
        icon: "R",
        cooldown: 55,
        duration: 8,
        target: "self",
        description: "Temporarily increases tower fire rate.",
      },
    ]),
    branches: Object.freeze([
      branch("damage", "Damage", [
        talent("human_damage_1", "damage", "Tempered Steel", "Towers deal 7% more damage.", [tower("damageMultiplier", 0.07)]),
        talent("human_damage_2", "damage", "Swift Verdict", "Judgement triggers one kill sooner.", [castle("judgementIntervalBonus", -1)], { prerequisite: "human_damage_1" }),
        talent("human_damage_3", "damage", "Condemnation", "Judgement adds 7% more damage taken.", [castle("judgementVulnerabilityBonus", 0.07)], { prerequisite: "human_damage_2" }),
        talent("human_damage_4", "damage", "Smite Focus", "Heavenly Strike deals 15% more damage.", [ability("heavenlyStrike", "damageMultiplier", 0.15)], { prerequisite: "human_damage_3" }),
        talent("human_damage_5", "damage", "Marked Detonation", "Judged enemies burst on death.", [castle("judgementExplosionDamage", 65), castle("judgementExplosionRadius", 70)], { prerequisite: "human_damage_4", final: true }),
      ]),
      branch("speed", "Speed", [
        talent("human_speed_1", "speed", "Drilled Crews", "Towers attack 7% faster.", [tower("fireRateMultiplier", 0.07)]),
        talent("human_speed_2", "speed", "Quick Hands", "Projectiles fly 10% faster.", [tower("projectileSpeedMultiplier", 0.1)], { prerequisite: "human_speed_1" }),
        talent("human_speed_3", "speed", "Battle Rhythm", "Castle ability cooldowns are 8% shorter.", [castle("cooldownMultiplierBonus", -0.08)], { prerequisite: "human_speed_2" }),
        talent("human_speed_4", "speed", "Long Horn Call", "Rally Horn lasts 2 seconds longer.", [ability("rallyHorn", "durationBonus", 2)], { prerequisite: "human_speed_3" }),
        talent("human_speed_5", "speed", "Zealous Volley", "Rally Horn gives another 10% fire rate.", [ability("rallyHorn", "fireRateBonus", 0.1)], { prerequisite: "human_speed_4", final: true }),
      ]),
      branch("range", "Range", [
        talent("human_range_1", "range", "Watch Towers", "Towers gain 8% range.", [tower("rangeMultiplier", 0.08)]),
        talent("human_range_2", "range", "Fortified Gate", "Base loses 10% less life from enemy hits.", [castle("baseDamageReduction", 0.1)], { prerequisite: "human_range_1" }),
        talent("human_range_3", "range", "Last Stand", "Enemies near the base are slowed slightly.", [castle("emergencySlowNearBase", 0.18)], { prerequisite: "human_range_2" }),
        talent("human_range_4", "range", "High Sanctuary", "Heavenly Strike also applies Judgement.", [ability("heavenlyStrike", "appliesJudgement", 1)], { prerequisite: "human_range_3" }),
        talent("human_range_5", "range", "Sacred Ground", "Judgement lasts 3 seconds longer.", [castle("judgementDurationBonus", 3)], { prerequisite: "human_range_4", final: true }),
      ]),
    ]),
  },
  {
    id: "elf",
    name: "Elven Grove",
    title: "Moon Grove Tree",
    icon: "E",
    color: "#78bd6b",
    description: "Poison, range, roots, and wave control.",
    strength: "Strong damage over time and area denial.",
    weakness: "Burst damage is weaker without setup.",
    uniqueMechanic: "Towers can gain Nature Poison through talents.",
    uniqueResource: DEFAULT_RESOURCE,
    abilities: Object.freeze([
      {
        id: "thornRain",
        name: "Thorn Rain",
        icon: "T",
        cooldown: 40,
        areaRadius: 90,
        target: "area",
        damageType: "piercing",
        description: "Area damage and poison.",
      },
      {
        id: "ancientRoots",
        name: "Ancient Roots",
        icon: "A",
        cooldown: 50,
        areaRadius: 100,
        target: "area",
        description: "Roots, then slows enemies in an area.",
      },
    ]),
    branches: Object.freeze([
      branch("poison", "Poison", [
        talent("elf_poison_1", "poison", "Venom Tips", "Projectiles apply weak poison.", [towerSpecial("poisonDps", 3), towerSpecial("poisonDuration", 3)]),
        talent("elf_poison_2", "poison", "Deep Venom", "Poison deals 2 more DPS.", [towerSpecial("poisonDps", 2)], { prerequisite: "elf_poison_1" }),
        talent("elf_poison_3", "poison", "Lingering Sap", "Poison lasts 2 seconds longer.", [towerSpecial("poisonDuration", 2)], { prerequisite: "elf_poison_2" }),
        talent("elf_poison_4", "poison", "Barbed Storm", "Thorn Rain poison is stronger.", [ability("thornRain", "poisonDpsBonus", 8)], { prerequisite: "elf_poison_3" }),
        talent("elf_poison_5", "poison", "Toxic Bloom", "Poisoned enemies spread poison on death.", [castle("poisonSpreadOnDeath", 1)], { prerequisite: "elf_poison_4", final: true }),
      ]),
      branch("wind", "Wind", [
        talent("elf_wind_1", "wind", "Tailwind", "Towers attack 6% faster.", [tower("fireRateMultiplier", 0.06)]),
        talent("elf_wind_2", "wind", "Feather Shafts", "Projectiles fly 12% faster.", [tower("projectileSpeedMultiplier", 0.12)], { prerequisite: "elf_wind_1" }),
        talent("elf_wind_3", "wind", "Open Skies", "Castle ability cooldowns are 7% shorter.", [castle("cooldownMultiplierBonus", -0.07)], { prerequisite: "elf_wind_2" }),
        talent("elf_wind_4", "wind", "Storm Needles", "Thorn Rain recharges 15% faster.", [ability("thornRain", "cooldownMultiplier", -0.15)], { prerequisite: "elf_wind_3" }),
        talent("elf_wind_5", "wind", "Gale Blessing", "All towers gain another 7% fire rate.", [tower("fireRateMultiplier", 0.07)], { prerequisite: "elf_wind_4", final: true }),
      ]),
      branch("roots", "Roots", [
        talent("elf_roots_1", "roots", "Long Roots", "Towers gain 7% range.", [tower("rangeMultiplier", 0.07)]),
        talent("elf_roots_2", "roots", "Sticky Ground", "Slow effects are 6% stronger.", [towerSpecial("slowPercent", 0.06)], { prerequisite: "elf_roots_1" }),
        talent("elf_roots_3", "roots", "Old Bark", "Ancient Roots root lasts 0.6 seconds longer.", [ability("ancientRoots", "rootDurationBonus", 0.6)], { prerequisite: "elf_roots_2" }),
        talent("elf_roots_4", "roots", "Wide Snare", "Ancient Roots radius is 18 larger.", [ability("ancientRoots", "radiusBonus", 18)], { prerequisite: "elf_roots_3" }),
        talent("elf_roots_5", "roots", "Forest Prison", "Ancient Roots also poisons trapped enemies.", [ability("ancientRoots", "poisonDpsBonus", 6)], { prerequisite: "elf_roots_4", final: true }),
      ]),
    ]),
  },
  {
    id: "undead",
    name: "Undead Necropolis",
    title: "Bone Throne Necropolis",
    icon: "U",
    color: "#9a86c8",
    description: "Souls, curses, finishing damage, and plague zones.",
    strength: "Powerful actives and attrition when kills are flowing.",
    weakness: "Soul costs limit repeated burst casts.",
    uniqueMechanic: "Kills grant souls. Souls fuel necromantic active abilities.",
    uniqueResource: Object.freeze({ key: "souls", label: "Souls", initial: 0, max: 40 }),
    abilities: Object.freeze([
      {
        id: "fingerOfDeath",
        name: "Finger of Death",
        icon: "F",
        cooldown: 18,
        soulsCost: 5,
        target: "strongest",
        damageType: "chaos",
        description: "Heavy damage to the strongest enemy.",
      },
      {
        id: "plagueCloud",
        name: "Plague Cloud",
        icon: "P",
        cooldown: 45,
        soulsCost: 8,
        areaRadius: 100,
        duration: 8,
        target: "area",
        description: "A damaging slowing zone on the road.",
      },
    ]),
    branches: Object.freeze([
      branch("harvest", "Harvest", [
        talent("undead_harvest_1", "harvest", "Soul Sickle", "Every third kill grants one extra soul.", [castle("extraSoulEveryKills", 3)]),
        talent("undead_harvest_2", "harvest", "Weakness Curse", "Damaged enemies can take 6% more damage.", [castle("curseVulnerability", 0.06)], { prerequisite: "undead_harvest_1" }),
        talent("undead_harvest_3", "harvest", "Cruel Harvest", "Towers deal 6% more damage.", [tower("damageMultiplier", 0.06)], { prerequisite: "undead_harvest_2" }),
        talent("undead_harvest_4", "harvest", "Soul Refund", "Finger of Death refunds one more soul on kill.", [ability("fingerOfDeath", "refundBonus", 1)], { prerequisite: "undead_harvest_3" }),
        talent("undead_harvest_5", "harvest", "Execution Rite", "Finger of Death executes very low HP targets.", [ability("fingerOfDeath", "executeThreshold", 0.12)], { prerequisite: "undead_harvest_4", final: true }),
      ]),
      branch("legion", "Legion", [
        talent("undead_legion_1", "legion", "Bone Aim", "Projectiles fly 9% faster.", [tower("projectileSpeedMultiplier", 0.09)]),
        talent("undead_legion_2", "legion", "Grave Volley", "Towers attack 6% faster.", [tower("fireRateMultiplier", 0.06)], { prerequisite: "undead_legion_1" }),
        talent("undead_legion_3", "legion", "Ghost Blades", "Chain and instant towers gain 8% damage.", [castle("spiritDamageBonus", 0.08)], { prerequisite: "undead_legion_2" }),
        talent("undead_legion_4", "legion", "Cold Command", "Castle ability cooldowns are 6% shorter.", [castle("cooldownMultiplierBonus", -0.06)], { prerequisite: "undead_legion_3" }),
        talent("undead_legion_5", "legion", "Death March", "All towers gain another 6% damage.", [tower("damageMultiplier", 0.06)], { prerequisite: "undead_legion_4", final: true }),
      ]),
      branch("plague", "Plague", [
        talent("undead_plague_1", "plague", "Rot Touch", "Projectiles apply a small plague poison.", [towerSpecial("poisonDps", 2), towerSpecial("poisonDuration", 4)]),
        talent("undead_plague_2", "plague", "Sickly Air", "Slow effects are 5% stronger.", [towerSpecial("slowPercent", 0.05)], { prerequisite: "undead_plague_1" }),
        talent("undead_plague_3", "plague", "Dense Cloud", "Plague Cloud radius is 20 larger.", [ability("plagueCloud", "radiusBonus", 20)], { prerequisite: "undead_plague_2" }),
        talent("undead_plague_4", "plague", "Virulent Cloud", "Plague Cloud deals more damage over time.", [ability("plagueCloud", "dpsBonus", 8)], { prerequisite: "undead_plague_3" }),
        talent("undead_plague_5", "plague", "Black Miasma", "Plague Cloud slows harder and lasts longer.", [ability("plagueCloud", "slowBonus", 0.1), ability("plagueCloud", "durationBonus", 2)], { prerequisite: "undead_plague_4", final: true }),
      ]),
    ]),
  },
]);

export const CASTLES_BY_ID = Object.freeze(
  Object.fromEntries(CASTLE_TYPES.map((castleType) => [castleType.id, castleType])),
);

export const TALENTS_BY_ID = Object.freeze(
  Object.fromEntries(
    CASTLE_TYPES.flatMap((castleType) =>
      castleType.branches.flatMap((branchConfig) => branchConfig.talents.map((talentConfig) => [talentConfig.id, talentConfig])),
    ),
  ),
);
