const DEFAULT_RESOURCE = Object.freeze({ key: null, label: "", initial: 0, max: 0 });

function talent(id, branch, name, description, effects, options = {}) {
  return Object.freeze({
    id,
    branch,
    name,
    description,
    cost: options.cost || 1,
    prerequisite: options.prerequisite || null,
    requiredPoints: options.requiredPoints || 0,
    final: options.final || false,
    row: Number.isFinite(options.row) ? options.row : null,
    col: Number.isFinite(options.col) ? options.col : null,
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
    description: "Balanced tower buffs, disciplined critical strikes, and defensive control.",
    strength: "Reliable damage, modest crit scaling, and broad tower support.",
    weakness: "Needs talent investment before critical strikes become consistent.",
    uniqueMechanic: "Tower attacks have a small chance to critically strike for increased damage.",
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
        talent("human_damage_1", "damage", "Tempered Steel", "Towers deal 5% more damage.", [tower("damageMultiplier", 0.05)], { row: 0, col: 1 }),
        talent("human_damage_2", "damage", "Keen Edges", "Tower attacks gain 2% crit chance.", [castle("critChance", 0.02)], { prerequisite: "human_damage_1", row: 1, col: 0 }),
        talent("human_damage_3", "damage", "Heavy Draw", "Critical strikes deal 10% more bonus damage.", [castle("critDamageBonus", 0.1)], { prerequisite: "human_damage_1", row: 1, col: 2 }),
        talent("human_damage_4", "damage", "Captain Training", "Towers deal another 4% damage.", [tower("damageMultiplier", 0.04)], { prerequisite: "human_damage_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("human_damage_5", "damage", "Smite Focus", "Heavenly Strike deals 15% more damage.", [ability("heavenlyStrike", "damageMultiplier", 0.15)], { prerequisite: "human_damage_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("human_damage_6", "damage", "Expose Weakness", "Tower attacks gain another 2% crit chance.", [castle("critChance", 0.02)], { prerequisite: "human_damage_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("human_damage_7", "damage", "Crushing Impact", "Critical strikes deal another 12% bonus damage.", [castle("critDamageBonus", 0.12)], { prerequisite: "human_damage_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("human_damage_8", "damage", "Field Arsenal", "Towers deal another 5% damage.", [tower("damageMultiplier", 0.05)], { prerequisite: "human_damage_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("human_damage_9", "damage", "Sacred Impact", "Heavenly Strike deals another 10% damage.", [ability("heavenlyStrike", "damageMultiplier", 0.1)], { prerequisite: "human_damage_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("human_damage_10", "damage", "Coordinated Fire", "Tower attacks gain 3% crit chance and crits hit harder.", [castle("critChance", 0.03), castle("critDamageBonus", 0.15)], { prerequisite: "human_damage_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("speed", "Speed", [
        talent("human_speed_1", "speed", "Drilled Crews", "Towers attack 5% faster.", [tower("fireRateMultiplier", 0.05)], { row: 0, col: 1 }),
        talent("human_speed_2", "speed", "Quick Hands", "Projectiles fly 10% faster.", [tower("projectileSpeedMultiplier", 0.1)], { prerequisite: "human_speed_1", row: 1, col: 0 }),
        talent("human_speed_3", "speed", "Battle Rhythm", "Castle ability cooldowns are 6% shorter.", [castle("cooldownMultiplierBonus", -0.06)], { prerequisite: "human_speed_1", row: 1, col: 2 }),
        talent("human_speed_4", "speed", "Ready Orders", "Towers recover 4% faster between attacks.", [tower("cooldownMultiplier", -0.04)], { prerequisite: "human_speed_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("human_speed_5", "speed", "Long Horn Call", "Rally Horn lasts 2 seconds longer.", [ability("rallyHorn", "durationBonus", 2)], { prerequisite: "human_speed_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("human_speed_6", "speed", "Volley Drill", "Towers attack another 4% faster.", [tower("fireRateMultiplier", 0.04)], { prerequisite: "human_speed_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("human_speed_7", "speed", "Signal Discipline", "Rally Horn gives another 8% fire rate.", [ability("rallyHorn", "fireRateBonus", 0.08)], { prerequisite: "human_speed_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("human_speed_8", "speed", "Rapid Fletching", "Projectiles fly another 8% faster.", [tower("projectileSpeedMultiplier", 0.08)], { prerequisite: "human_speed_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("human_speed_9", "speed", "Command Cadence", "Castle ability cooldowns are another 5% shorter.", [castle("cooldownMultiplierBonus", -0.05)], { prerequisite: "human_speed_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("human_speed_10", "speed", "Zealous Volley", "Rally Horn lasts longer and gives more fire rate.", [ability("rallyHorn", "durationBonus", 1), ability("rallyHorn", "fireRateBonus", 0.08)], { prerequisite: "human_speed_9", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("range", "Range", [
        talent("human_range_1", "range", "Watch Towers", "Towers gain 6% range.", [tower("rangeMultiplier", 0.06)], { row: 0, col: 1 }),
        talent("human_range_2", "range", "Fortified Gate", "Base loses 8% less life from enemy hits.", [castle("baseDamageReduction", 0.08)], { prerequisite: "human_range_1", row: 1, col: 0 }),
        talent("human_range_3", "range", "High Ground", "Towers gain another 5% range.", [tower("rangeMultiplier", 0.05)], { prerequisite: "human_range_1", row: 1, col: 2 }),
        talent("human_range_4", "range", "Last Stand", "Enemies near the base are slowed slightly.", [castle("emergencySlowNearBase", 0.14)], { prerequisite: "human_range_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("human_range_5", "range", "Ballistic Lines", "Projectiles fly 8% faster.", [tower("projectileSpeedMultiplier", 0.08)], { prerequisite: "human_range_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("human_range_6", "range", "Supply Beacons", "Mana regenerates 1 faster per second.", [castle("manaRegenBonus", 1)], { prerequisite: "human_range_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("human_range_7", "range", "Sight Runes", "Towers gain another 4% range.", [tower("rangeMultiplier", 0.04)], { prerequisite: "human_range_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("human_range_8", "range", "Stone Ward", "Base loses another 6% less life from enemy hits.", [castle("baseDamageReduction", 0.06)], { prerequisite: "human_range_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("human_range_9", "range", "Far Sight", "Heavenly Strike deals 10% more damage.", [ability("heavenlyStrike", "damageMultiplier", 0.1)], { prerequisite: "human_range_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("human_range_10", "range", "Sacred Ramparts", "Base protection and tower range both improve.", [castle("baseDamageReduction", 0.06), tower("rangeMultiplier", 0.04)], { prerequisite: "human_range_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
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
        talent("elf_poison_1", "poison", "Venom Tips", "Projectiles apply weak poison.", [towerSpecial("poisonDps", 1.5), towerSpecial("poisonDuration", 2.2)], { row: 0, col: 1 }),
        talent("elf_poison_2", "poison", "Deep Venom", "Poison deals 1 more DPS.", [towerSpecial("poisonDps", 1)], { prerequisite: "elf_poison_1", row: 1, col: 0 }),
        talent("elf_poison_3", "poison", "Lingering Sap", "Poison lasts 0.8 seconds longer.", [towerSpecial("poisonDuration", 0.8)], { prerequisite: "elf_poison_1", row: 1, col: 2 }),
        talent("elf_poison_4", "poison", "Green Fletching", "Projectiles fly 8% faster.", [tower("projectileSpeedMultiplier", 0.08)], { prerequisite: "elf_poison_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("elf_poison_5", "poison", "Barbed Storm", "Thorn Rain poison is stronger.", [ability("thornRain", "poisonDpsBonus", 3)], { prerequisite: "elf_poison_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("elf_poison_6", "poison", "Clinging Resin", "Poison lasts another 0.8 seconds.", [towerSpecial("poisonDuration", 0.8)], { prerequisite: "elf_poison_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("elf_poison_7", "poison", "Bitter Rain", "Thorn Rain recharges 8% faster.", [ability("thornRain", "cooldownMultiplier", -0.08)], { prerequisite: "elf_poison_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("elf_poison_8", "poison", "Black Sap", "Poison deals another 1 DPS.", [towerSpecial("poisonDps", 1)], { prerequisite: "elf_poison_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("elf_poison_9", "poison", "Wide Spores", "Thorn Rain radius is 12 larger.", [ability("thornRain", "radiusBonus", 12)], { prerequisite: "elf_poison_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("elf_poison_10", "poison", "Toxic Bloom", "Poisoned enemies spread weaker poison on death.", [castle("poisonSpreadOnDeath", 1)], { prerequisite: "elf_poison_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("wind", "Wind", [
        talent("elf_wind_1", "wind", "Tailwind", "Towers attack 5% faster.", [tower("fireRateMultiplier", 0.05)], { row: 0, col: 1 }),
        talent("elf_wind_2", "wind", "Feather Shafts", "Projectiles fly 10% faster.", [tower("projectileSpeedMultiplier", 0.1)], { prerequisite: "elf_wind_1", row: 1, col: 0 }),
        talent("elf_wind_3", "wind", "Open Skies", "Castle ability cooldowns are 6% shorter.", [castle("cooldownMultiplierBonus", -0.06)], { prerequisite: "elf_wind_1", row: 1, col: 2 }),
        talent("elf_wind_4", "wind", "Quick Canopy", "Towers recover 4% faster between attacks.", [tower("cooldownMultiplier", -0.04)], { prerequisite: "elf_wind_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("elf_wind_5", "wind", "Storm Needles", "Thorn Rain recharges 10% faster.", [ability("thornRain", "cooldownMultiplier", -0.1)], { prerequisite: "elf_wind_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("elf_wind_6", "wind", "Gust Lanes", "Towers gain 4% range.", [tower("rangeMultiplier", 0.04)], { prerequisite: "elf_wind_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("elf_wind_7", "wind", "Moon Breeze", "Mana regenerates 1 faster per second.", [castle("manaRegenBonus", 1)], { prerequisite: "elf_wind_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("elf_wind_8", "wind", "Gale Volley", "Towers attack another 4% faster.", [tower("fireRateMultiplier", 0.04)], { prerequisite: "elf_wind_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("elf_wind_9", "wind", "Swift Roots", "Ancient Roots recharges 8% faster.", [ability("ancientRoots", "cooldownMultiplier", -0.08)], { prerequisite: "elf_wind_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("elf_wind_10", "wind", "Gale Blessing", "All towers attack faster and fire projectiles quicker.", [tower("fireRateMultiplier", 0.05), tower("projectileSpeedMultiplier", 0.08)], { prerequisite: "elf_wind_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("roots", "Roots", [
        talent("elf_roots_1", "roots", "Long Roots", "Towers gain 6% range.", [tower("rangeMultiplier", 0.06)], { row: 0, col: 1 }),
        talent("elf_roots_2", "roots", "Sticky Ground", "Slow effects are 4% stronger.", [towerSpecial("slowPercent", 0.04)], { prerequisite: "elf_roots_1", row: 1, col: 0 }),
        talent("elf_roots_3", "roots", "Old Bark", "Ancient Roots root lasts 0.5 seconds longer.", [ability("ancientRoots", "rootDurationBonus", 0.5)], { prerequisite: "elf_roots_1", row: 1, col: 2 }),
        talent("elf_roots_4", "roots", "Briar Reach", "Towers gain another 4% range.", [tower("rangeMultiplier", 0.04)], { prerequisite: "elf_roots_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("elf_roots_5", "roots", "Wide Snare", "Ancient Roots radius is 14 larger.", [ability("ancientRoots", "radiusBonus", 14)], { prerequisite: "elf_roots_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("elf_roots_6", "roots", "Deep Roots", "Ancient Roots root lasts another 0.4 seconds.", [ability("ancientRoots", "rootDurationBonus", 0.4)], { prerequisite: "elf_roots_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("elf_roots_7", "roots", "Calming Shade", "Base loses 6% less life from enemy hits.", [castle("baseDamageReduction", 0.06)], { prerequisite: "elf_roots_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("elf_roots_8", "roots", "Thorned Bark", "Ancient Roots also poisons trapped enemies.", [ability("ancientRoots", "poisonDpsBonus", 3)], { prerequisite: "elf_roots_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("elf_roots_9", "roots", "Forest Net", "Slow effects last 0.4 seconds longer.", [towerSpecial("slowDuration", 0.4)], { prerequisite: "elf_roots_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("elf_roots_10", "roots", "Forest Prison", "Ancient Roots lasts longer and covers more ground.", [ability("ancientRoots", "rootDurationBonus", 0.5), ability("ancientRoots", "radiusBonus", 10)], { prerequisite: "elf_roots_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
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
    weakness: "Spending souls lowers the passive damage stored souls provide.",
    uniqueMechanic: "Kills grant souls. Stored souls slightly increase tower damage, and active abilities spend them.",
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
        cooldown: 55,
        soulsCost: 10,
        areaRadius: 90,
        duration: 6,
        target: "area",
        description: "A damaging slowing zone on the road.",
      },
    ]),
    branches: Object.freeze([
      branch("harvest", "Harvest", [
        talent("undead_harvest_1", "harvest", "Soul Sickle", "Every third kill grants one extra soul.", [castle("extraSoulEveryKills", 3)], { row: 0, col: 1 }),
        talent("undead_harvest_2", "harvest", "Deep Vessel", "Maximum souls increased by 8.", [castle("soulsMaxBonus", 8)], { prerequisite: "undead_harvest_1", row: 1, col: 0 }),
        talent("undead_harvest_3", "harvest", "Weakness Curse", "Damaged enemies can take 5% more damage.", [castle("curseVulnerability", 0.05)], { prerequisite: "undead_harvest_1", row: 1, col: 2 }),
        talent("undead_harvest_4", "harvest", "Soul Pressure", "Each stored soul gives slightly more tower damage.", [castle("soulDamagePerSoul", 0.001)], { prerequisite: "undead_harvest_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("undead_harvest_5", "harvest", "Cruel Harvest", "Towers deal 5% more damage.", [tower("damageMultiplier", 0.05)], { prerequisite: "undead_harvest_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("undead_harvest_6", "harvest", "Bone Tithe", "Maximum souls increased by another 8.", [castle("soulsMaxBonus", 8)], { prerequisite: "undead_harvest_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("undead_harvest_7", "harvest", "Soul Refund", "Finger of Death refunds one more soul on kill.", [ability("fingerOfDeath", "refundBonus", 1)], { prerequisite: "undead_harvest_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("undead_harvest_8", "harvest", "Bound Legion", "Stored soul damage can scale a little higher.", [castle("soulDamageCap", 0.24)], { prerequisite: "undead_harvest_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("undead_harvest_9", "harvest", "Execution Rite", "Finger of Death executes very low HP targets.", [ability("fingerOfDeath", "executeThreshold", 0.1)], { prerequisite: "undead_harvest_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("undead_harvest_10", "harvest", "Black Reaping", "Soul storage and stored-soul damage both improve.", [castle("soulsMaxBonus", 10), castle("soulDamagePerSoul", 0.001)], { prerequisite: "undead_harvest_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("legion", "Legion", [
        talent("undead_legion_1", "legion", "Bone Aim", "Projectiles fly 8% faster.", [tower("projectileSpeedMultiplier", 0.08)], { row: 0, col: 1 }),
        talent("undead_legion_2", "legion", "Grave Volley", "Towers attack 5% faster.", [tower("fireRateMultiplier", 0.05)], { prerequisite: "undead_legion_1", row: 1, col: 0 }),
        talent("undead_legion_3", "legion", "Ghost Blades", "Chain and instant towers gain 6% damage.", [castle("spiritDamageBonus", 0.06)], { prerequisite: "undead_legion_1", row: 1, col: 2 }),
        talent("undead_legion_4", "legion", "Cold Command", "Castle ability cooldowns are 5% shorter.", [castle("cooldownMultiplierBonus", -0.05)], { prerequisite: "undead_legion_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("undead_legion_5", "legion", "Wraith Crew", "Towers recover 4% faster between attacks.", [tower("cooldownMultiplier", -0.04)], { prerequisite: "undead_legion_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("undead_legion_6", "legion", "Grave Standards", "Towers gain 4% range.", [tower("rangeMultiplier", 0.04)], { prerequisite: "undead_legion_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("undead_legion_7", "legion", "Spectral Relays", "Chain and instant towers gain another 5% damage.", [castle("spiritDamageBonus", 0.05)], { prerequisite: "undead_legion_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("undead_legion_8", "legion", "Death March", "All towers gain another 5% damage.", [tower("damageMultiplier", 0.05)], { prerequisite: "undead_legion_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("undead_legion_9", "legion", "Bone Engineers", "Projectiles fly another 8% faster.", [tower("projectileSpeedMultiplier", 0.08)], { prerequisite: "undead_legion_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("undead_legion_10", "legion", "Endless Ranks", "Towers attack faster and stored souls hit harder.", [tower("fireRateMultiplier", 0.04), castle("soulDamagePerSoul", 0.001)], { prerequisite: "undead_legion_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
      ]),
      branch("plague", "Plague", [
        talent("undead_plague_1", "plague", "Rot Touch", "Projectiles apply a small plague poison.", [towerSpecial("poisonDps", 1), towerSpecial("poisonDuration", 2.5)], { row: 0, col: 1 }),
        talent("undead_plague_2", "plague", "Sickly Air", "Slow effects are 3% stronger.", [towerSpecial("slowPercent", 0.03)], { prerequisite: "undead_plague_1", row: 1, col: 0 }),
        talent("undead_plague_3", "plague", "Dense Cloud", "Plague Cloud radius is 10 larger.", [ability("plagueCloud", "radiusBonus", 10)], { prerequisite: "undead_plague_1", row: 1, col: 2 }),
        talent("undead_plague_4", "plague", "Lingering Fever", "Plague poison lasts 0.7 seconds longer.", [towerSpecial("poisonDuration", 0.7)], { prerequisite: "undead_plague_2", requiredPoints: 2, row: 2, col: 0 }),
        talent("undead_plague_5", "plague", "Virulent Cloud", "Plague Cloud deals more damage over time.", [ability("plagueCloud", "dpsBonus", 3)], { prerequisite: "undead_plague_3", requiredPoints: 2, row: 2, col: 2 }),
        talent("undead_plague_6", "plague", "Withering Paths", "Plague Cloud slows slightly harder.", [ability("plagueCloud", "slowBonus", 0.04)], { prerequisite: "undead_plague_4", requiredPoints: 4, row: 3, col: 0 }),
        talent("undead_plague_7", "plague", "Rot Reservoir", "Maximum souls increased by 6.", [castle("soulsMaxBonus", 6)], { prerequisite: "undead_plague_5", requiredPoints: 4, row: 3, col: 2 }),
        talent("undead_plague_8", "plague", "Pestilent Bolts", "Plague poison deals another 1 DPS.", [towerSpecial("poisonDps", 1)], { prerequisite: "undead_plague_6", requiredPoints: 6, row: 4, col: 0 }),
        talent("undead_plague_9", "plague", "Black Air", "Plague Cloud lasts 1 second longer.", [ability("plagueCloud", "durationBonus", 1)], { prerequisite: "undead_plague_7", requiredPoints: 6, row: 4, col: 2 }),
        talent("undead_plague_10", "plague", "Black Miasma", "Plague Cloud slows harder and deals more damage.", [ability("plagueCloud", "slowBonus", 0.04), ability("plagueCloud", "dpsBonus", 3)], { prerequisite: "undead_plague_8", requiredPoints: 8, final: true, cost: 2, row: 5, col: 1 }),
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
