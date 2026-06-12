const STORAGE_KEY = "forest-gate-defense-save";
const SAVE_VERSION = 2;

const DEFAULT_DATA = Object.freeze({
  version: SAVE_VERSION,
  bestScore: 0,
  completedWave: 0,
  tutorialSeen: false,
  unlockedTowers: ["archer", "cannon", "frost"],
  unlockedCastles: ["human", "elf", "undead"],
  lastSelectedCastleId: "human",
  castleMastery: {},
  settings: { sound: true },
  totalKills: 0,
  lastSaveTime: 0,
});

export class Storage {
  constructor(yandexSDK) {
    this.yandexSDK = yandexSDK;
    this.player = null;
    this.cache = {
      ...DEFAULT_DATA,
      settings: { ...DEFAULT_DATA.settings },
      unlockedTowers: [...DEFAULT_DATA.unlockedTowers],
      unlockedCastles: [...DEFAULT_DATA.unlockedCastles],
      castleMastery: { ...DEFAULT_DATA.castleMastery },
    };
    this.saveTimer = 0;
    this.pending = false;
  }

  async init() {
    this.player = await this.yandexSDK.getPlayer();
    this.cache = await this.load();
    return this.cache;
  }

  async load() {
    let data = null;
    if (this.player?.getData) {
      try {
        data = await this.player.getData();
      } catch (error) {
        console.warn("[Storage] Yandex load failed.", error);
      }
    }

    if (!data) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        data = raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.warn("[Storage] localStorage load failed.", error);
      }
    }

    return this.migrate(data);
  }

  migrate(data) {
    if (!data || typeof data !== "object") {
      return {
        ...DEFAULT_DATA,
        settings: { ...DEFAULT_DATA.settings },
        unlockedTowers: [...DEFAULT_DATA.unlockedTowers],
        unlockedCastles: [...DEFAULT_DATA.unlockedCastles],
        castleMastery: { ...DEFAULT_DATA.castleMastery },
      };
    }
    return {
      ...DEFAULT_DATA,
      ...data,
      version: SAVE_VERSION,
      settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) },
      unlockedTowers: Array.isArray(data.unlockedTowers) ? data.unlockedTowers : [...DEFAULT_DATA.unlockedTowers],
      unlockedCastles: Array.isArray(data.unlockedCastles) ? data.unlockedCastles : [...DEFAULT_DATA.unlockedCastles],
      castleMastery: data.castleMastery && typeof data.castleMastery === "object" ? data.castleMastery : {},
      lastSelectedCastleId: data.lastSelectedCastleId || DEFAULT_DATA.lastSelectedCastleId,
    };
  }

  queueSave(partial) {
    this.cache = {
      ...this.cache,
      ...partial,
      settings: { ...this.cache.settings, ...(partial.settings || {}) },
      lastSaveTime: Date.now(),
      version: SAVE_VERSION,
    };
    this.pending = true;
    this.saveTimer = Math.max(this.saveTimer, 0.8);
  }

  update(dt) {
    if (!this.pending) return;
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.flush();
    }
  }

  async flush() {
    if (!this.pending) return;
    this.pending = false;
    const data = { ...this.cache, lastSaveTime: Date.now() };
    this.cache = data;

    if (this.player?.setData) {
      try {
        await this.player.setData(data);
        return;
      } catch (error) {
        console.warn("[Storage] Yandex save failed.", error);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("[Storage] localStorage save failed.", error);
    }
  }
}
