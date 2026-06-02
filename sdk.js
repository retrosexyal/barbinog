(function () {
  if (window.YaGames) return;

  const saveKey = "forest-gate-defense-yandex-mock-player";
  const leaderboardKey = "forest-gate-defense-yandex-mock-leaderboard";

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local private browsing modes can reject writes. The game has its own fallback too.
    }
  }

  window.YaGames = {
    async init() {
      return {
        features: {
          LoadingAPI: { ready() {} },
          loading_api: { ready() {} },
          GameplayAPI: { start() {}, stop() {}, on() {} },
          gameplay_api: { start() {}, stop() {} },
        },
        adv: {
          showFullscreenAdv({ callbacks } = {}) {
            setTimeout(() => callbacks?.onClose?.(), 120);
          },
          showRewardedVideo({ callbacks } = {}) {
            setTimeout(() => {
              callbacks?.onRewarded?.();
              callbacks?.onClose?.();
            }, 120);
          },
        },
        auth: {
          async openAuthDialog() {
            return true;
          },
        },
        async getPlayer() {
          return {
            getMode() {
              return "full";
            },
            async getData() {
              return readJson(saveKey, {});
            },
            async setData(data) {
              writeJson(saveKey, data);
            },
          };
        },
        leaderboards: {
          async setScore(name, score) {
            const entries = readJson(`${leaderboardKey}:${name}`, []);
            entries.push({ name: "Local Player", score, rank: 1 });
            entries.sort((a, b) => b.score - a.score);
            writeJson(`${leaderboardKey}:${name}`, entries.slice(0, 10));
          },
          async getEntries(name, options = {}) {
            const quantity = options.quantityTop || 10;
            const entries = readJson(`${leaderboardKey}:${name}`, []).slice(0, quantity);
            return {
              entries: entries.map((entry, index) => ({
                rank: index + 1,
                score: entry.score,
                player: { publicName: entry.name || "Local Player" },
              })),
            };
          },
          async getPlayerEntry(name) {
            const entries = readJson(`${leaderboardKey}:${name}`, []);
            return entries.length ? { rank: 1, score: entries[0].score } : null;
          },
        },
        on() {},
      };
    },
  };
})();
