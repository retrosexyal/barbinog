export class Input {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.world = { x: 0, y: 0 };
    this.tile = { x: 0, y: 0 };
    this.bind();
  }

  bind() {
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event), { passive: false });
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
      this.game.handleUIAction(button.action, button.meta);
      return;
    }

    if (!this.game.isRunState() || !this.game.camera.isInPlayArea(point.x, point.y)) return;
    this.game.camera.screenToWorld(point.x, point.y, this.world);
    this.game.map.worldToTile(this.world.x, this.world.y, this.tile);
    if (!this.game.map.isInBounds(this.tile.x, this.tile.y)) return;

    if (event.button === 2) {
      this.game.selectedTowerType = null;
      return;
    }

    this.game.handleMapClick(this.tile.x, this.tile.y);
  }

  onKeyDown(event) {
    if (event.code === "Space") {
      event.preventDefault();
      if (this.game.state === "paused") this.game.togglePause();
      else this.game.startWave();
    }
    if (event.code === "Escape") {
      event.preventDefault();
      if (this.game.state === "leaderboard") this.game.closeLeaderboard();
      else if (this.game.state !== "menu") this.game.togglePause();
    }
  }
}
