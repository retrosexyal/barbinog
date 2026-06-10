export const NEXT_WAVE_AUTO_START_DELAY = 10;

export const WAVES = Object.freeze([
  { wave: 1, groups: [{ enemyId: "dog", count: 10, spawnInterval: 0.75, delayBeforeNextGroup: 0 }], rewardOnComplete: 35 },
  { wave: 2, groups: [{ enemyId: "boar", count: 14, spawnInterval: 0.65, delayBeforeNextGroup: 0 }], rewardOnComplete: 40 },
  {
    wave: 3,
    groups: [{ enemyId: "walrus", count: 12, spawnInterval: 0.8, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 55,
  },
  {
    wave: 4,
    groups: [{ enemyId: "murloc", count: 20, spawnInterval: 0.42, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 65,
  },
  {
    wave: 5,
    groups: [{ enemyId: "flyingSheep", count: 16, spawnInterval: 0.55, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 80,
  },
  {
    wave: 6,
    groups: [{ enemyId: "ratfolkScavenger", count: 24, spawnInterval: 0.32, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 95,
  },
  {
    wave: 7,
    groups: [{ enemyId: "rustyShieldMercenary", count: 22, spawnInterval: 0.48, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 110,
  },
  {
    wave: 8,
    groups: [{ enemyId: "goblinSapper", count: 18, spawnInterval: 0.46, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 130,
  },
  {
    wave: 9,
    groups: [{ enemyId: "swampShaman", count: 18, spawnInterval: 0.52, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 170,
  },
  {
    wave: 10,
    groups: [{ enemyId: "boneMaskWolf", count: 24, spawnInterval: 0.34, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 210,
  },
  {
    wave: 11,
    groups: [{ enemyId: "stoneskinTroll", count: 10, spawnInterval: 0.9, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 250,
  },
  {
    wave: 12,
    groups: [{ enemyId: "riftHarpy", count: 20, spawnInterval: 0.36, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 320,
  },
  {
    wave: 13,
    groups: [{ enemyId: "armoredBeetle", count: 20, spawnInterval: 0.58, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 380,
  },
  {
    wave: 14,
    groups: [{ enemyId: "glassElemental", count: 18, spawnInterval: 0.52, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 440,
  },
  {
    wave: 15,
    groups: [{ enemyId: "blackTractBandit", count: 26, spawnInterval: 0.38, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 520,
  },
  {
    wave: 16,
    groups: [{ enemyId: "boss", count: 1, spawnInterval: 1, delayBeforeNextGroup: 0 }],
    rewardOnComplete: 680,
  },
]);
