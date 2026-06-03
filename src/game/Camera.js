import { clamp } from "../utils/math.js";

export class Camera {
  constructor(map) {
    this.map = map;
    this.worldWidth = map.width * map.tileSize;
    this.worldHeight = map.height * map.tileSize;
    this.width = 1;
    this.height = 1;
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.uiRect = { x: 0, y: 0, w: 1, h: 1 };
    this.statsRect = { x: 0, y: 0, w: 0, h: 0 };
    this.leftUiRect = { x: 0, y: 0, w: 0, h: 0 };
    this.rightUiRect = { x: 0, y: 0, w: 0, h: 0 };
    this.playRect = { x: 0, y: 0, w: 1, h: 1 };
  }

  resize(width, height) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);

    const portrait = this.height > this.width;
    if (portrait) {
      const statsHeight = 36;
      const uiHeight = clamp(this.height * 0.19, 128, 162);
      this.statsRect.x = 0;
      this.statsRect.y = 0;
      this.statsRect.w = this.width;
      this.statsRect.h = statsHeight;
      this.uiRect.x = 0;
      this.uiRect.y = this.height - uiHeight;
      this.uiRect.w = this.width;
      this.uiRect.h = uiHeight;
      this.leftUiRect.x = 0;
      this.leftUiRect.y = 0;
      this.leftUiRect.w = 0;
      this.leftUiRect.h = 0;
      this.rightUiRect.x = 0;
      this.rightUiRect.y = 0;
      this.rightUiRect.w = 0;
      this.rightUiRect.h = 0;
      this.playRect.x = 0;
      this.playRect.y = statsHeight;
      this.playRect.w = this.width;
      this.playRect.h = Math.max(1, this.height - statsHeight - uiHeight);
    } else {
      const fullHeightMapWidth = this.height * (this.worldWidth / this.worldHeight);
      const maxSideUiWidth = Math.max(0, (this.width - fullHeightMapWidth) * 0.5);
      const sideUiWidth = Math.floor(maxSideUiWidth);
      this.statsRect.x = 0;
      this.statsRect.y = 0;
      this.statsRect.w = 0;
      this.statsRect.h = 0;
      this.uiRect.x = 0;
      this.uiRect.y = 0;
      this.uiRect.w = 0;
      this.uiRect.h = 0;
      this.leftUiRect.x = 0;
      this.leftUiRect.y = 0;
      this.leftUiRect.w = sideUiWidth;
      this.leftUiRect.h = this.height;
      this.rightUiRect.x = this.width - sideUiWidth;
      this.rightUiRect.y = 0;
      this.rightUiRect.w = sideUiWidth;
      this.rightUiRect.h = this.height;
      this.playRect.x = sideUiWidth;
      this.playRect.y = 0;
      this.playRect.w = Math.max(1, this.width - sideUiWidth * 2);
      this.playRect.h = this.height;
    }

    const margin = 0;
    const scaleX = (this.playRect.w - margin * 2) / this.worldWidth;
    const scaleY = (this.playRect.h - margin * 2) / this.worldHeight;
    this.scale = Math.max(0.2, Math.min(scaleX, scaleY));
    this.x = this.playRect.x + (this.playRect.w - this.worldWidth * this.scale) * 0.5;
    this.y = this.playRect.y + (this.playRect.h - this.worldHeight * this.scale) * 0.5;
  }

  screenToWorld(x, y, out = { x: 0, y: 0 }) {
    out.x = (x - this.x) / this.scale;
    out.y = (y - this.y) / this.scale;
    return out;
  }

  worldToScreen(x, y, out = { x: 0, y: 0 }) {
    out.x = this.x + x * this.scale;
    out.y = this.y + y * this.scale;
    return out;
  }

  worldToTile(x, y, out = { x: 0, y: 0 }) {
    out.x = Math.floor(x / this.map.tileSize);
    out.y = Math.floor(y / this.map.tileSize);
    return out;
  }

  isInPlayArea(x, y) {
    return x >= this.playRect.x && x <= this.playRect.x + this.playRect.w && y >= this.playRect.y && y <= this.playRect.y + this.playRect.h;
  }
}
