export const LEADERBOARD_NAME = "main";

const LOCAL_KEY = "forest-gate-defense-leaderboard";

export class Leaderboard {
  constructor(yandexSDK) {
    this.yandexSDK = yandexSDK;
    this.localEntries = this.loadLocal();
  }

  async submitScore(score) {
    const value = Math.floor(score);
    if (this.yandexSDK.isAvailable() && this.yandexSDK.ysdk?.leaderboards?.setScore) {
      try {
        await this.yandexSDK.ysdk.leaderboards.setScore(LEADERBOARD_NAME, value);
        return true;
      } catch (error) {
        console.warn("[Leaderboard] submit failed, using local mock.", error);
      }
    }
    this.localEntries.push({ name: "Local Player", score: value, date: Date.now() });
    this.localEntries.sort((a, b) => b.score - a.score);
    this.localEntries = this.localEntries.slice(0, 10);
    this.saveLocal();
    return true;
  }

  async getTop(limit = 10) {
    if (this.yandexSDK.isAvailable() && this.yandexSDK.ysdk?.leaderboards?.getEntries) {
      try {
        const data = await this.yandexSDK.ysdk.leaderboards.getEntries(LEADERBOARD_NAME, {
          quantityTop: limit,
          includeUser: true,
          quantityAround: 3,
        });
        return (data.entries || []).map((entry) => ({
          name: entry.player?.publicName || "Player",
          score: entry.score,
          rank: entry.rank,
        }));
      } catch (error) {
        console.warn("[Leaderboard] getTop failed, using local mock.", error);
      }
    }

    return this.localEntries.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  async getPlayerRank() {
    if (this.yandexSDK.isAvailable() && this.yandexSDK.ysdk?.leaderboards?.getPlayerEntry) {
      try {
        const entry = await this.yandexSDK.ysdk.leaderboards.getPlayerEntry(LEADERBOARD_NAME);
        return entry?.rank || null;
      } catch (error) {
        console.warn("[Leaderboard] getPlayerRank failed.", error);
      }
    }
    return this.localEntries.length ? 1 : null;
  }

  loadLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.localEntries));
    } catch (error) {
      console.warn("[Leaderboard] local save failed.", error);
    }
  }
}
