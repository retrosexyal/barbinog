export class YandexSDK {
  constructor() {
    this.ysdk = null;
    this.player = null;
    this.available = false;
    this.pauseHandlers = [];
  }

  async init() {
    if (!window.YaGames || typeof window.YaGames.init !== "function") {
      console.info("[YandexSDK] YaGames unavailable, running local fallback.");
      return null;
    }

    try {
      this.ysdk = await window.YaGames.init();
      this.available = true;
      this.bindPauseResume();
      return this.ysdk;
    } catch (error) {
      console.warn("[YandexSDK] init failed, using fallback.", error);
      this.ysdk = null;
      this.available = false;
      return null;
    }
  }

  isAvailable() {
    return this.available && !!this.ysdk;
  }

  async getPlayer() {
    if (!this.isAvailable() || !this.ysdk.getPlayer) return null;
    if (this.player) return this.player;
    try {
      this.player = await this.ysdk.getPlayer({ scopes: false });
      return this.player;
    } catch (error) {
      console.warn("[YandexSDK] getPlayer failed.", error);
      return null;
    }
  }

  async requestAuth() {
    if (!this.isAvailable() || !this.ysdk.auth?.openAuthDialog) return null;
    try {
      await this.ysdk.auth.openAuthDialog();
      this.player = null;
      return this.getPlayer();
    } catch (error) {
      console.warn("[YandexSDK] auth failed.", error);
      return null;
    }
  }

  ready() {
    try {
      this.ysdk?.features?.LoadingAPI?.ready?.();
      this.ysdk?.features?.loading_api?.ready?.();
    } catch (error) {
      console.warn("[YandexSDK] ready failed.", error);
    }
  }

  gameplayStart() {
    try {
      this.ysdk?.features?.GameplayAPI?.start?.();
      this.ysdk?.features?.gameplay_api?.start?.();
    } catch (error) {
      console.warn("[YandexSDK] gameplayStart failed.", error);
    }
  }

  gameplayStop() {
    try {
      this.ysdk?.features?.GameplayAPI?.stop?.();
      this.ysdk?.features?.gameplay_api?.stop?.();
    } catch (error) {
      console.warn("[YandexSDK] gameplayStop failed.", error);
    }
  }

  onPauseResume(handler) {
    this.pauseHandlers.push(handler);
  }

  bindPauseResume() {
    const dispatch = (paused) => {
      for (const handler of this.pauseHandlers) handler(paused);
    };
    try {
      this.ysdk?.on?.("game_api_pause", () => dispatch(true));
      this.ysdk?.on?.("game_api_resume", () => dispatch(false));
      this.ysdk?.features?.GameplayAPI?.on?.("pause", () => dispatch(true));
      this.ysdk?.features?.GameplayAPI?.on?.("resume", () => dispatch(false));
    } catch (error) {
      console.warn("[YandexSDK] pause/resume binding failed.", error);
    }
  }

  async showFullscreenAd() {
    if (!this.isAvailable() || !this.ysdk.adv?.showFullscreenAdv) return false;
    this.gameplayStop();
    try {
      await new Promise((resolve) => {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: resolve,
            onError: resolve,
            onOffline: resolve,
          },
        });
      });
      return true;
    } catch (error) {
      console.warn("[YandexSDK] fullscreen ad failed.", error);
      return false;
    } finally {
      this.gameplayStart();
    }
  }

  async showRewardedAd() {
    if (!this.isAvailable() || !this.ysdk.adv?.showRewardedVideo) return false;
    this.gameplayStop();
    let rewarded = false;
    try {
      await new Promise((resolve) => {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: resolve,
            onError: resolve,
          },
        });
      });
      return rewarded;
    } catch (error) {
      console.warn("[YandexSDK] rewarded ad failed.", error);
      return false;
    } finally {
      this.gameplayStart();
    }
  }
}
