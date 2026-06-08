export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.world = { x: 0, y: 0 };
    this.tile = { x: 0, y: 0 };
    this.talentHold = null;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event), { passive: false });
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event), { passive: false });
    this.canvas.addEventListener("pointercancel", (event) => this.onPointerCancel(event), { passive: false });
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("blur", () => this.game.pauseFromSystem());
  }

  pointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  onPointerMove(event) {
    event.preventDefault();
    const point = this.pointFromEvent(event);
    this.game.ui.setPointer(point.x, point.y);
    if (this.talentHold) {
      const dx = point.x - this.talentHold.x;
      const dy = point.y - this.talentHold.y;
      if (dx * dx + dy * dy > 196) {
        this.talentHold = null;
        this.game.ui.cancelTalentHold();
      }
    }
    if (this.game.ui.blocksPointer(point.x, point.y)) {
      this.game.hoverTile = null;
      return;
    }
    if (!this.game.camera.isInPlayArea(point.x, point.y)) {
      this.game.hoverTile = null;
      return;
    }
    this.game.camera.screenToWorld(point.x, point.y, this.world);
    this.game.map.worldToTile(this.world.x, this.world.y, this.tile);
    if (this.game.map.isInBounds(this.tile.x, this.tile.y)) {
      this.game.hoverTile = { x: this.tile.x, y: this.tile.y };
    } else {
      this.game.hoverTile = null;
    }
  }

  onPointerDown(event) {
    event.preventDefault();
    const point = this.pointFromEvent(event);
    this.game.ui.setPointer(point.x, point.y);
    const button = this.game.ui.hitTest(point.x, point.y);
    if (button) {
      if (button.action === "unlockTalent" && event.pointerType !== "mouse") {
        this.talentHold = {
          button,
          x: point.x,
          y: point.y,
          pointerId: event.pointerId,
        };
        this.game.ui.beginTalentHold(button.meta.talentId, point.x, point.y);
        return;
      }
      this.game.handleUIAction(button.action, button.meta);
      return;
    }

    if (this.game.ui.blocksPointer(point.x, point.y)) return;
    if (!this.game.isRunState() || !this.game.camera.isInPlayArea(point.x, point.y)) return;
    this.game.camera.screenToWorld(point.x, point.y, this.world);
    this.game.map.worldToTile(this.world.x, this.world.y, this.tile);
    if (!this.game.map.isInBounds(this.tile.x, this.tile.y)) return;

    if (event.button === 2) {
      this.game.selectedTowerType = null;
      this.game.selectedEnemy = null;
      this.game.selectedCastle = false;
      return;
    }

    this.game.handleMapClick(this.tile.x, this.tile.y, this.world.x, this.world.y);
  }

  onPointerUp(event) {
    event.preventDefault();
    const point = this.pointFromEvent(event);
    this.game.ui.setPointer(point.x, point.y);
    if (!this.talentHold || this.talentHold.pointerId !== event.pointerId) return;
    const hold = this.talentHold;
    this.talentHold = null;
    const wasLongPress = this.game.ui.finishTalentHold();
    const button = this.game.ui.hitTest(point.x, point.y);
    if (!wasLongPress && button?.action === "unlockTalent" && button.meta?.talentId === hold.button.meta?.talentId) {
      this.game.handleUIAction(button.action, button.meta);
    }
  }

  onPointerCancel(event) {
    event.preventDefault();
    if (this.talentHold?.pointerId === event.pointerId) {
      this.talentHold = null;
      this.game.ui.cancelTalentHold();
    }
  }

  onKeyDown(event) {
    if (event.code === "Space") {
      event.preventDefault();
      if (this.game.state === "paused") this.game.togglePause();
      else this.game.startWave();
    }
    if (event.code === "Escape") {
      event.preventDefault();
      if (this.game.ui.pendingTalentConfirmId) this.game.ui.closeTalentConfirm();
      else if (this.game.talentPanelOpen) this.game.talentPanelOpen = false;
      else if (this.game.pendingAbilityId) this.game.pendingAbilityId = null;
      else if (this.game.state === "leaderboard") this.game.closeLeaderboard();
      else if (this.game.state !== "menu") this.game.togglePause();
    }
  }
}
