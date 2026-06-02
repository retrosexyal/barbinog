export const NEXT_WAVE_AUTO_START_DELAY = 10;

export const WAVES = Object.freeze([
  { wave: 1, groups: [{ enemyId: "dog", count: 10, spawnInterval: 0.75, delayBeforeNextGroup: 0 }], rewardOnComplete: 35 },
  { wave: 2, groups: [{ enemyId: "basic", count: 14, spawnInterval: 0.65, delayBeforeNextGroup: 0 }], rewardOnComplete: 40 },
  {
    wave: 3,
    groups: [
      { enemyId: "swarm", count: 16, spawnInterval: 0.35, delayBeforeNextGroup: 1 },
      { enemyId: "basic", count: 8, spawnInterval: 0.7, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 55,
  },
  {
    wave: 4,
    groups: [
      { enemyId: "fast", count: 12, spawnInterval: 0.48, delayBeforeNextGroup: 1 },
      { enemyId: "basic", count: 10, spawnInterval: 0.6, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 65,
  },
  {
    wave: 5,
    groups: [
      { enemyId: "armored", count: 8, spawnInterval: 0.9, delayBeforeNextGroup: 1 },
      { enemyId: "swarm", count: 18, spawnInterval: 0.32, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 80,
  },
  {
    wave: 6,
    groups: [
      { enemyId: "fast", count: 18, spawnInterval: 0.42, delayBeforeNextGroup: 1 },
      { enemyId: "armored", count: 8, spawnInterval: 0.85, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 95,
  },
  {
    wave: 7,
    groups: [
      { enemyId: "basic", count: 24, spawnInterval: 0.42, delayBeforeNextGroup: 1 },
      { enemyId: "swarm", count: 24, spawnInterval: 0.25, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 110,
  },
  {
    wave: 8,
    groups: [
      { enemyId: "armored", count: 14, spawnInterval: 0.72, delayBeforeNextGroup: 1 },
      { enemyId: "fast", count: 18, spawnInterval: 0.38, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 130,
  },
  {
    wave: 9,
    groups: [
      { enemyId: "boss", count: 1, spawnInterval: 1, delayBeforeNextGroup: 1.4 },
      { enemyId: "swarm", count: 28, spawnInterval: 0.24, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 170,
  },
  {
    wave: 10,
    groups: [
      { enemyId: "armored", count: 18, spawnInterval: 0.62, delayBeforeNextGroup: 1 },
      { enemyId: "fast", count: 24, spawnInterval: 0.33, delayBeforeNextGroup: 0.5 },
      { enemyId: "basic", count: 22, spawnInterval: 0.4, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 210,
  },
  {
    wave: 11,
    groups: [
      { enemyId: "swarm", count: 44, spawnInterval: 0.18, delayBeforeNextGroup: 0.8 },
      { enemyId: "armored", count: 16, spawnInterval: 0.58, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 250,
  },
  {
    wave: 12,
    groups: [
      { enemyId: "boss", count: 2, spawnInterval: 3.2, delayBeforeNextGroup: 1 },
      { enemyId: "fast", count: 32, spawnInterval: 0.28, delayBeforeNextGroup: 0 },
    ],
    rewardOnComplete: 320,
  },
]);
