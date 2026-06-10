// Balance guide:
// - minDamage/maxDamage are rolled once per shot before armor and type modifiers.
// - upgrade damage is an additive delta to both damage bounds unless minDamage/maxDamage are set.
// - fireRate is attacks per second. Raising it increases projectile count and CPU load.
// - range is in world pixels. One tile is 48 px in the default map.
// - upgrades are additive deltas applied in order. Keep costs higher than the gold
//   earned from one average enemy group to preserve meaningful choices.
// - attackType controls delivery mechanics. damageType controls the attack-vs-armor table.
// - buildTime is construction time in seconds before the tower starts attacking.

export const TARGET_MODES = Object.freeze([
  "first",
  "last",
  "nearest",
  "strongest",
]);

const TOWER_SPRITE_SCALE = 1.425;

function towerSprite(fileName, drawWidth, drawHeight, anchorY) {
  return Object.freeze({
    imageSrc: new URL(`../assets/towers/${fileName}`, import.meta.url).href,
    drawWidth: Math.round(drawWidth * TOWER_SPRITE_SCALE),
    drawHeight: Math.round(drawHeight * TOWER_SPRITE_SCALE),
    anchorY,
  });
}

function singleCastleSpriteSet(slug, drawWidth = 58, drawHeight = 68, anchorY = 0.58) {
  return Object.freeze({
    human: Object.freeze([towerSprite(`human-${slug}.png`, drawWidth, drawHeight, anchorY)]),
    elf: Object.freeze([towerSprite(`elf-${slug}.png`, drawWidth, drawHeight, anchorY)]),
    undead: Object.freeze([towerSprite(`undead-${slug}.png`, drawWidth, drawHeight, anchorY)]),
  });
}

const ARCHER_SPRITES = Object.freeze({
  human: Object.freeze([
    towerSprite("archer-tower.png", 48, 58, 0.66),
    towerSprite("human-archer-tower-2.png", 58, 68, 0.66),
    towerSprite("human-archer-tower-3.png", 58, 68, 0.66),
  ]),
  elf: Object.freeze([
    towerSprite("elf-archer-tower.png", 58, 68, 0.66),
    towerSprite("elf-archer-tower-2.png", 58, 68, 0.66),
    towerSprite("elf-archer-tower-3.png", 58, 68, 0.66),
  ]),
  undead: Object.freeze([
    towerSprite("undead-archer-tower.png", 58, 68, 0.66),
    towerSprite("undead-archer-tower-2.png", 58, 68, 0.66),
    towerSprite("undead-archer-tower-3.png", 58, 68, 0.66),
  ]),
});

const CANNON_SPRITES = Object.freeze({
  human: Object.freeze([
    towerSprite("canon-tower.png", 58, 68, 0.56),
    towerSprite("human-cannon-tower-2.png", 58, 68, 0.56),
    towerSprite("human-cannon-tower-3.png", 58, 68, 0.56),
  ]),
  elf: Object.freeze([
    towerSprite("elf-cannon-tower.png", 58, 68, 0.56),
    towerSprite("elf-cannon-tower-2.png", 58, 68, 0.56),
    towerSprite("elf-cannon-tower-3.png", 58, 68, 0.56),
  ]),
  undead: Object.freeze([
    towerSprite("undead-cannon-tower.png", 58, 68, 0.56),
    towerSprite("undead-cannon-tower-2.png", 58, 68, 0.56),
    towerSprite("undead-cannon-tower-3.png", 58, 68, 0.56),
  ]),
});

const FROST_SPRITES = Object.freeze({
  human: Object.freeze([
    towerSprite("frost-tower.png", 58, 68, 0.56),
    towerSprite("human-frost-tower-2.png", 58, 68, 0.56),
    towerSprite("human-frost-tower-3.png", 58, 68, 0.56),
  ]),
  elf: Object.freeze([
    towerSprite("elf-frost-tower.png", 58, 68, 0.56),
    towerSprite("elf-frost-tower-2.png", 58, 68, 0.56),
    towerSprite("elf-frost-tower-3.png", 58, 68, 0.56),
  ]),
  undead: Object.freeze([
    towerSprite("undead-frost-tower.png", 58, 68, 0.56),
    towerSprite("undead-frost-tower-2.png", 58, 68, 0.56),
    towerSprite("undead-frost-tower-3.png", 58, 68, 0.56),
  ]),
});

const MAGIC_SPRITES = singleCastleSpriteSet("magic-tower", 58, 72, 0.58);
const SENTINEL_SPRITES = singleCastleSpriteSet("sentinel-post", 62, 70, 0.58);
const VENOM_SPRITES = singleCastleSpriteSet("venom-totem", 58, 70, 0.58);
const BALLISTA_SPRITES = singleCastleSpriteSet("sky-ballista", 68, 72, 0.58);
const OBELISK_SPRITES = singleCastleSpriteSet("rift-obelisk", 62, 78, 0.58);
const STORM_SPRITES = singleCastleSpriteSet("storm-relay", 64, 74, 0.58);

export function getTowerSpriteConfig(config, castleId = "human", level = 0) {
  const variants = config?.spriteVariants?.[castleId] || config?.spriteVariants?.human;
  if (!variants?.length) return config?.sprite || null;
  const tier = Math.max(0, Math.min(variants.length - 1, level || 0));
  return variants[tier] || config?.sprite || null;
}

export function getTowerCastleVariant(config, castleId = "human") {
  return config?.castleVariants?.[castleId] || config?.castleVariants?.human || null;
}

export function getTowerDisplayName(config, castleId = "human") {
  return getTowerCastleVariant(config, castleId)?.name || config?.name || "";
}

export function getTowerDisplayDescription(config, castleId = "human") {
  return getTowerCastleVariant(config, castleId)?.description || config?.description || "";
}

export const TOWER_TYPES = Object.freeze([
  {
    id: "archer",
    name: "Archer Tower",
    description: "Cheap, fast single-target shots.",
    cost: 120,
    buildTime: 1.2,
    sellRatio: 0.7,
    icon: "A",
    color: "#c48a42",
    shape: "arrow",
    sprite: ARCHER_SPRITES.human[0],
    spriteVariants: ARCHER_SPRITES,
    projectileDY: -30,
    projectileSprite: {
      imageSrc: new URL("../assets/projectiles/arrow.png", import.meta.url)
        .href,
      drawWidth: 28,
      drawHeight: 9,
    },
    range: 150,
    minDamage: 6,
    maxDamage: 10,
    fireRate: 1.35,
    projectileSpeed: 430,
    targetMode: "first",
    attackType: "projectile",
    damageType: "piercing",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 0,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      {
        name: "Fletching",
        cost: 70,
        damage: 8,
        range: 12,
        fireRate: 0.15,
        projectileSpeed: 40,
      },
      {
        name: "Falcon Aim",
        cost: 130,
        damage: 14,
        range: 16,
        fireRate: 0.2,
        projectileSpeed: 55,
      },
      {
        name: "Volley Crew",
        cost: 230,
        damage: 20,
        range: 20,
        fireRate: 0.35,
        projectileSpeed: 70,
      },
    ],
  },
  {
    id: "cannon",
    name: "Cannon Tower",
    description: "Slow siege blasts with splash damage.",
    cost: 250,
    buildTime: 2.0,
    sellRatio: 0.68,
    icon: "C",
    color: "#6e5a43",
    shape: "cannon",
    sprite: CANNON_SPRITES.human[0],
    spriteVariants: CANNON_SPRITES,
    projectileSprite: {
      imageSrc: new URL("../assets/projectiles/cannonball.png", import.meta.url)
        .href,
      drawWidth: 16,
      drawHeight: 16,
    },
    projectileDX: 10,
    projectileDY: -30,
    range: 135,
    minDamage: 18,
    maxDamage: 20,
    fireRate: 0.62,
    projectileSpeed: 290,
    targetMode: "nearest",
    attackType: "aoe",
    damageType: "siege",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 58,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      {
        name: "Packed Powder",
        cost: 100,
        damage: 18,
        range: 8,
        fireRate: 0.04,
        special: { splashRadius: 8 },
      },
      {
        name: "Iron Bombs",
        cost: 190,
        damage: 30,
        range: 10,
        fireRate: 0.06,
        special: { splashRadius: 10 },
      },
      {
        name: "Earthshaker",
        cost: 330,
        damage: 48,
        range: 12,
        fireRate: 0.08,
        special: { splashRadius: 14 },
      },
    ],
  },
  {
    id: "frost",
    name: "Frost Tower",
    description: "Low damage, reliable slow.",
    cost: 290,
    buildTime: 1.6,
    sellRatio: 0.7,
    icon: "F",
    color: "#6fd4ff",
    shape: "crystal",
    sprite: FROST_SPRITES.human[0],
    spriteVariants: FROST_SPRITES,
    projectileSprite: {
      imageSrc: new URL(
        "../assets/projectiles/frost-shard.png",
        import.meta.url,
      ).href,
      drawWidth: 24,
      drawHeight: 11,
    },
    range: 145,
    minDamage: 6,
    maxDamage: 10,
    fireRate: 0.85,
    projectileSpeed: 360,
    targetMode: "first",
    attackType: "slow",
    damageType: "magic",
    special: {
      slowPercent: 0.35,
      slowDuration: 1.8,
      splashRadius: 38,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      {
        name: "Cold Focus",
        cost: 85,
        damage: 5,
        range: 10,
        fireRate: 0.08,
        special: { slowPercent: 0.05, slowDuration: 0.35 },
      },
      {
        name: "Deep Freeze",
        cost: 160,
        damage: 8,
        range: 12,
        fireRate: 0.1,
        special: { slowPercent: 0.08, slowDuration: 0.45, splashRadius: 8 },
      },
      {
        name: "Winter Spire",
        cost: 280,
        damage: 12,
        range: 18,
        fireRate: 0.12,
        special: { slowPercent: 0.1, slowDuration: 0.6, splashRadius: 12 },
      },
    ],
  },
  {
    id: "magic",
    name: "Magic Tower",
    description: "High single-target magic beam.",
    cost: 480,
    buildTime: 2.2,
    sellRatio: 0.68,
    icon: "M",
    color: "#8c6dff",
    shape: "orb",
    sprite: MAGIC_SPRITES.human[0],
    spriteVariants: MAGIC_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Arcane Spire",
        description: "Royal battle-mages focus a precise armor-piercing beam.",
      }),
      elf: Object.freeze({
        name: "Moonwell Lens",
        description: "Grove crystals burn heavy enemies with focused moonlight.",
      }),
      undead: Object.freeze({
        name: "Soul Lantern",
        description: "A necropolis lantern drains single targets through a death ray.",
      }),
    }),
    range: 160,
    minDamage: 48,
    maxDamage: 60,
    fireRate: 0.72,
    projectileSpeed: 0,
    targetMode: "strongest",
    attackType: "instant",
    damageType: "magic",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 0,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      { name: "Bright Rune", cost: 120, damage: 24, range: 10, fireRate: 0.05 },
      { name: "Arc Lens", cost: 230, damage: 42, range: 14, fireRate: 0.08 },
      { name: "Pure Focus", cost: 380, damage: 68, range: 18, fireRate: 0.1 },
    ],
  },
  {
    id: "sentinel",
    name: "Sentinel Post",
    description: "Short-range chain strikes without blocking the road.",
    cost: 640,
    buildTime: 1.8,
    sellRatio: 0.7,
    icon: "S",
    color: "#3f7f89",
    shape: "banner",
    sprite: SENTINEL_SPRITES.human[0],
    spriteVariants: SENTINEL_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Marshal Post",
        description: "A disciplined command post chains attacks through nearby foes.",
      }),
      elf: Object.freeze({
        name: "Grove Watch",
        description: "Wardens mark passing enemies and jump strikes through the pack.",
      }),
      undead: Object.freeze({
        name: "Grave Standard",
        description: "A cursed banner lashes several enemies with spectral force.",
      }),
    }),
    range: 105,
    minDamage: 17,
    maxDamage: 23,
    fireRate: 1.0,
    projectileSpeed: 0,
    targetMode: "nearest",
    attackType: "chain",
    damageType: "chaos",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 72,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 3,
      chainFalloff: 0.72,
    },
    upgrades: [
      {
        name: "Long Halberds",
        cost: 95,
        damage: 10,
        range: 8,
        fireRate: 0.1,
        special: { chainTargets: 1 },
      },
      {
        name: "Signal Horn",
        cost: 170,
        damage: 16,
        range: 12,
        fireRate: 0.14,
        special: { chainFalloff: 0.08 },
      },
      {
        name: "Elite Watch",
        cost: 300,
        damage: 26,
        range: 15,
        fireRate: 0.18,
        special: { chainTargets: 1 },
      },
    ],
  },
  {
    id: "venom",
    name: "Venom Tower",
    description: "Poison shots punish durable enemies over time.",
    cost: 520,
    buildTime: 1.7,
    sellRatio: 0.7,
    icon: "V",
    color: "#78c95b",
    shape: "crystal",
    sprite: VENOM_SPRITES.human[0],
    spriteVariants: VENOM_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Alchemist Still",
        description: "Castle alchemists launch burning tinctures and lingering toxins.",
      }),
      elf: Object.freeze({
        name: "Venomroot Shrine",
        description: "Living roots distill poison into thorn-tipped bolts.",
      }),
      undead: Object.freeze({
        name: "Plague Font",
        description: "A rot-filled font infects enemies with grave sickness.",
      }),
    }),
    range: 150,
    minDamage: 10,
    maxDamage: 14,
    fireRate: 1.0,
    projectileSpeed: 340,
    targetMode: "strongest",
    attackType: "projectile",
    damageType: "magic",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 0,
      poisonDps: 9,
      poisonDuration: 4,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      { name: "Bitter Mix", cost: 150, damage: 8, range: 8, fireRate: 0.08, special: { poisonDps: 4 } },
      { name: "Clinging Venom", cost: 280, damage: 12, range: 10, fireRate: 0.1, special: { poisonDuration: 2 } },
      { name: "Black Distillate", cost: 470, damage: 18, range: 14, fireRate: 0.12, special: { poisonDps: 7 } },
    ],
  },
  {
    id: "ballista",
    name: "Sky Ballista",
    description: "Long-range heavy bolts for priority targets.",
    cost: 760,
    buildTime: 2.4,
    sellRatio: 0.68,
    icon: "B",
    color: "#d1a14f",
    shape: "arrow",
    sprite: BALLISTA_SPRITES.human[0],
    spriteVariants: BALLISTA_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Royal Ballista",
        description: "A royal siege crew fires heavy bolts across the field.",
      }),
      elf: Object.freeze({
        name: "Starbow Platform",
        description: "Elven starwood limbs launch precise long-range arrows.",
      }),
      undead: Object.freeze({
        name: "Bone Harpoon",
        description: "A bone-rigged launcher skewers priority targets from afar.",
      }),
    }),
    projectileDY: -28,
    projectileSprite: {
      imageSrc: new URL("../assets/projectiles/arrow.png", import.meta.url).href,
      drawWidth: 36,
      drawHeight: 12,
    },
    range: 205,
    minDamage: 70,
    maxDamage: 92,
    fireRate: 0.48,
    projectileSpeed: 520,
    targetMode: "strongest",
    attackType: "projectile",
    damageType: "piercing",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 0,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      { name: "Winch Crew", cost: 260, damage: 30, range: 12, fireRate: 0.05, projectileSpeed: 40 },
      { name: "Broadhead Bolts", cost: 470, damage: 48, range: 14, fireRate: 0.06, projectileSpeed: 50 },
      { name: "Sky Piercer", cost: 780, damage: 76, range: 18, fireRate: 0.08, projectileSpeed: 65 },
    ],
  },
  {
    id: "obelisk",
    name: "Rift Obelisk",
    description: "Expensive chaos beam that ignores armor weaknesses.",
    cost: 920,
    buildTime: 2.6,
    sellRatio: 0.66,
    icon: "R",
    color: "#b178ff",
    shape: "orb",
    sprite: OBELISK_SPRITES.human[0],
    spriteVariants: OBELISK_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Judgement Obelisk",
        description: "A sanctified obelisk brands high-health enemies with pure force.",
      }),
      elf: Object.freeze({
        name: "Heartwood Monolith",
        description: "Ancient living stone channels wild energy into a steady beam.",
      }),
      undead: Object.freeze({
        name: "Black Obelisk",
        description: "A necropolis monolith tears life from the strongest enemy.",
      }),
    }),
    range: 170,
    minDamage: 92,
    maxDamage: 118,
    fireRate: 0.58,
    projectileSpeed: 0,
    targetMode: "strongest",
    attackType: "instant",
    damageType: "chaos",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 0,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 0,
      chainFalloff: 0,
    },
    upgrades: [
      { name: "Rift Focus", cost: 320, damage: 42, range: 10, fireRate: 0.04 },
      { name: "Deep Channel", cost: 590, damage: 68, range: 12, fireRate: 0.05 },
      { name: "Open Gate", cost: 960, damage: 108, range: 16, fireRate: 0.07 },
    ],
  },
  {
    id: "storm",
    name: "Storm Relay",
    description: "Late-game chain lightning for dense waves.",
    cost: 1050,
    buildTime: 2.2,
    sellRatio: 0.68,
    icon: "T",
    color: "#d9f279",
    shape: "banner",
    sprite: STORM_SPRITES.human[0],
    spriteVariants: STORM_SPRITES,
    castleVariants: Object.freeze({
      human: Object.freeze({
        name: "Storm Relay",
        description: "Engineers bind storm rods into a chain-lightning battery.",
      }),
      elf: Object.freeze({
        name: "Tempest Grove",
        description: "Wind spirits leap between enemies from a living storm shrine.",
      }),
      undead: Object.freeze({
        name: "Wraith Relay",
        description: "Restless spirits arc through clustered enemies in pale lightning.",
      }),
    }),
    range: 145,
    minDamage: 34,
    maxDamage: 46,
    fireRate: 0.9,
    projectileSpeed: 0,
    targetMode: "nearest",
    attackType: "chain",
    damageType: "magic",
    special: {
      slowPercent: 0,
      slowDuration: 0,
      splashRadius: 92,
      poisonDps: 0,
      poisonDuration: 0,
      chainTargets: 5,
      chainFalloff: 0.68,
    },
    upgrades: [
      { name: "Copper Rods", cost: 360, damage: 16, range: 8, fireRate: 0.08, special: { chainTargets: 1 } },
      { name: "Charged Relay", cost: 640, damage: 24, range: 10, fireRate: 0.1, special: { chainFalloff: 0.06 } },
      { name: "Thunder Net", cost: 1040, damage: 38, range: 12, fireRate: 0.14, special: { chainTargets: 2 } },
    ],
  },
]);

export const TOWERS_BY_ID = Object.freeze(
  Object.fromEntries(TOWER_TYPES.map((tower) => [tower.id, tower])),
);
