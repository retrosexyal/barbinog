import { MAP_ART_ASSETS, MapArt } from "./MapArt.js";
import { getTowerSpriteConfig } from "../config/towers.js";
import { TAU } from "../utils/math.js";

function compareTowerDrawOrder(a, b) {
  return a.y - b.y || a.x - b.x;
}

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.camera = camera;
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.drawCalls = 0;
    this.images = new Map();
    this.mapBackground = null;
    this.mapBackgroundKey = "";
    this.mapArt = new MapArt(this.images);
    this.towerDrawOrder = [];
    this.hitTestCanvas = null;
    this.hitTestCtx = null;
  }

  async loadEnemySprites(enemyTypes) {
    const sources = new Set();
    for (const enemyType of Object.values(enemyTypes)) {
      for (const animation of Object.values(enemyType.animations || {})) {
        if (animation.imageSrc) sources.add(animation.imageSrc);
      }
    }

    await Promise.all(
      [...sources].map((source) =>
        this.loadImage(source).catch((error) => {
          console.warn(`[Renderer] Failed to load sprite ${source}`, error);
          return null;
        })
      )
    );
  }

  async loadTowerSprites(towerTypes) {
    const sources = new Set();
    for (const towerType of Object.values(towerTypes)) {
      if (towerType.sprite?.imageSrc) sources.add(towerType.sprite.imageSrc);
      for (const variants of Object.values(towerType.spriteVariants || {})) {
        for (const sprite of variants || []) {
          if (sprite?.imageSrc) sources.add(sprite.imageSrc);
        }
      }
      if (towerType.projectileSprite?.imageSrc) sources.add(towerType.projectileSprite.imageSrc);
    }

    await Promise.all(
      [...sources].map((source) =>
        this.loadImage(source).catch((error) => {
          console.warn(`[Renderer] Failed to load sprite ${source}`, error);
          return null;
        })
      )
    );
  }

  async loadMapArtSprites() {
    await Promise.all(
      MAP_ART_ASSETS.map((source) =>
        this.loadImage(source).catch((error) => {
          console.warn(`[Renderer] Failed to load map art ${source}`, error);
          return null;
        })
      )
    );
  }

  loadImage(source) {
    const cached = this.images.get(source);
    if (cached) return cached.promise;

    const image = new Image();
    image.decoding = "async";
    const promise = new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    });
    image.src = source;
    this.images.set(source, { image, promise });
    return promise;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.camera.resize(width, height);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(game) {
    this.resize();
    this.updateMapArtTheme(game);
    const ctx = this.ctx;
    this.drawCalls = 0;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawViewportBackground(ctx);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);
    this.drawWorld(ctx, game);
    ctx.restore();

    game.ui.draw(ctx, game);

    if (game.debugPerf) {
      this.drawPerf(ctx, game);
    }
  }

  updateMapArtTheme(game) {
    const castleId =
      game.castleSystem?.state?.selectedCastleId ||
      game.castleSystem?.lastSelectedCastleId ||
      "human";
    this.mapArt.setTheme(castleId, this.width, this.height);
  }

  drawViewportBackground(ctx) {
    const image = this.mapArt.getImage("background");
    if (image) {
      this.mapArt.drawCoverImage(ctx, image, 0, 0, this.width, this.height);
      this.drawCalls += 1;
      return;
    }

    ctx.fillStyle = "#0f130e";
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawWorld(ctx, game) {
    this.drawMap(ctx, game);
    this.drawCastleZones(ctx, game);
    this.drawRanges(ctx, game);
    this.drawTowers(ctx, game.towers, game);
    this.drawTowerPlacementPreview(ctx, game);
    for (let i = 0; i < game.projectiles.length; i += 1) this.drawProjectile(ctx, game.projectiles[i]);
    for (let i = 0; i < game.enemies.length; i += 1) this.drawEnemy(ctx, game.enemies[i], game);
    for (let i = 0; i < game.effects.length; i += 1) this.drawEffect(ctx, game.effects[i]);
  }

  drawTowers(ctx, towers, game) {
    const order = this.towerDrawOrder;
    order.length = 0;
    for (let i = 0; i < towers.length; i += 1) order.push(towers[i]);
    order.sort(compareTowerDrawOrder);
    for (let i = 0; i < order.length; i += 1) this.drawTower(ctx, order[i], game);
  }

  drawMap(ctx, game) {
    const map = game.map;
    const background = this.getMapBackground(map, game.path);
    ctx.drawImage(background, 0, 0);
    this.drawCalls += 1;

    this.mapArt.drawBase(ctx, map, performance.now() / 1000);
    this.drawCalls += 1;

    this.drawBuildPads(ctx, game);
  }

  getMapBackground(map, path) {
    const tile = map.tileSize;
    const width = map.width * tile;
    const height = map.height * tile;
    const pathKey = path.points.map((point) => `${point.x},${point.y}`).join(";");
    const buildKey = map.buildableTiles.map((point) => `${point.x},${point.y}`).join(";");
    const blockKey = map.blockedTiles.map((point) => `${point.x},${point.y}`).join(";");
    const endpointKey = `${map.spawnPosition.x},${map.spawnPosition.y}:${map.basePosition.x},${map.basePosition.y}`;
    const key = `transparent:${this.mapArt.getStaticThemeKey()}:${width}x${height}:${tile}:${endpointKey}:${pathKey}:${buildKey}:${blockKey}`;

    if (!this.mapBackground || this.mapBackgroundKey !== key) {
      const canvas = this.createStaticCanvas(width, height);
      const bg = canvas.getContext("2d");
      const previousDrawCalls = this.drawCalls;
      this.drawStaticMap(bg, map, path, { includeBackground: false });
      this.drawCalls = previousDrawCalls;
      this.mapBackground = canvas;
      this.mapBackgroundKey = key;
    }

    return this.mapBackground;
  }

  createStaticCanvas(width, height) {
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  drawStaticMap(ctx, map, path, options = {}) {
    this.mapArt.drawStaticMap(ctx, map, path, options);
  }

  drawBuildPads(ctx, game) {
    return;
  }

  drawRanges(ctx, game) {
    const preview = game.getTowerPlacementPreview?.();
    if (preview) {
      this.drawRangeCircle(ctx, preview.worldX, preview.worldY, preview.range, preview.valid);
      return;
    }

    let tower = game.selectedTower;
    if (!tower && game.hoverTile) tower = game.getTowerAtTile(game.hoverTile.x, game.hoverTile.y);
    if (!tower) return;
    this.drawRangeCircle(ctx, tower.x, tower.y, tower.range, true);
  }

  drawRangeCircle(ctx, x, y, range, valid) {
    ctx.beginPath();
    ctx.arc(x, y, range, 0, TAU);
    ctx.fillStyle = valid ? "rgba(105, 178, 217, 0.12)" : "rgba(231, 105, 82, 0.12)";
    ctx.fill();
    ctx.strokeStyle = valid ? "rgba(188, 226, 255, 0.55)" : "rgba(255, 139, 116, 0.62)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTowerPlacementPreview(ctx, game) {
    const preview = game.getTowerPlacementPreview?.();
    if (!preview) return;

    ctx.save();
    ctx.globalAlpha = preview.valid ? 0.78 : 0.48;
    ctx.shadowColor = preview.valid ? "rgba(226, 243, 154, 0.95)" : "rgba(255, 118, 96, 0.95)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.translate(preview.worldX, preview.worldY);
    const tower = {
      config: preview.config,
      level: 0,
      isBuilding: false,
    };

    if (!this.drawTowerSprite(ctx, tower, { drawLevel: false, game })) {
      this.drawTowerPreviewShape(ctx, preview.config);
    }

    ctx.restore();
    this.drawCalls += 1;
  }

  drawCastleZones(ctx, game) {
    const zones = game.castleSystem?.state?.activeZones || [];
    for (let i = 0; i < zones.length; i += 1) {
      const zone = zones[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0.18, Math.min(0.36, zone.remaining / 4));
      ctx.fillStyle = zone.type === "plague" ? "#7b5ba5" : "#84df79";
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = zone.type === "plague" ? "#b9a0ff" : "#9cf08f";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTower(ctx, tower, game) {
    ctx.save();
    ctx.translate(tower.x, tower.y);

    if (tower.isBuilding) {
      this.drawTowerConstruction(ctx, tower);
      ctx.restore();
      this.drawCalls += 1;
      return;
    }

    if (this.drawTowerSprite(ctx, tower, { game })) {
      ctx.restore();
      this.drawCalls += 1;
      return;
    }

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 21, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#51412c";
    ctx.fillRect(-17, -8, 34, 28);
    ctx.fillStyle = tower.config.color;

    if (tower.config.shape === "cannon") {
      ctx.fillRect(-20, -10, 40, 20);
      ctx.fillStyle = "#25211d";
      ctx.fillRect(2, -16, 26, 12);
    } else if (tower.config.shape === "crystal") {
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(18, 4);
      ctx.lineTo(0, 23);
      ctx.lineTo(-18, 4);
      ctx.closePath();
      ctx.fill();
    } else if (tower.config.shape === "orb") {
      ctx.beginPath();
      ctx.arc(0, -6, 18, 0, TAU);
      ctx.fill();
    } else if (tower.config.shape === "banner") {
      ctx.fillRect(-4, -28, 8, 48);
      ctx.beginPath();
      ctx.moveTo(4, -26);
      ctx.lineTo(28, -16);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(22, 10);
      ctx.lineTo(-22, 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#f9efd8";
    ctx.font = "bold 14px Trebuchet MS, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${tower.level + 1}`, 0, 9);
    ctx.restore();
    this.drawCalls += 1;
  }

  getTowerCastleId(tower, game) {
    return (
      tower.castleId ||
      game?.castleSystem?.state?.selectedCastleId ||
      game?.castleSystem?.lastSelectedCastleId ||
      "human"
    );
  }

  drawTowerSprite(ctx, tower, options = {}) {
    const sprite = getTowerSpriteConfig(
      tower.config,
      this.getTowerCastleId(tower, options.game),
      tower.level || 0,
    );
    const image = sprite?.imageSrc ? this.images.get(sprite.imageSrc)?.image : null;
    if (!image || !image.complete || image.naturalWidth <= 0) return false;

    const drawWidth = sprite.drawWidth || 56;
    const drawHeight = sprite.drawHeight || (drawWidth * image.naturalHeight) / image.naturalWidth;
    const anchorY = sprite.anchorY ?? 0.78;

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 16, drawWidth * 0.38, 8, 0, 0, TAU);
    ctx.fill();

    ctx.drawImage(image, -drawWidth / 2, -drawHeight * anchorY, drawWidth, drawHeight);
    if (options.drawLevel !== false) this.drawTowerLevel(ctx, tower, 0, 10);
    return true;
  }

  drawTowerPreviewShape(ctx, config) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 21, 8, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#51412c";
    ctx.fillRect(-17, -8, 34, 28);
    ctx.fillStyle = config.color;

    if (config.shape === "cannon") {
      ctx.fillRect(-20, -10, 40, 20);
      ctx.fillStyle = "#25211d";
      ctx.fillRect(2, -16, 26, 12);
    } else if (config.shape === "crystal") {
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(18, 4);
      ctx.lineTo(0, 23);
      ctx.lineTo(-18, 4);
      ctx.closePath();
      ctx.fill();
    } else if (config.shape === "orb") {
      ctx.beginPath();
      ctx.arc(0, -6, 18, 0, TAU);
      ctx.fill();
    } else if (config.shape === "banner") {
      ctx.fillRect(-4, -28, 8, 48);
      ctx.beginPath();
      ctx.moveTo(4, -26);
      ctx.lineTo(28, -16);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(22, 10);
      ctx.lineTo(-22, 10);
      ctx.closePath();
      ctx.fill();
    }
  }

  hitTestTowerAt(towers, worldX, worldY) {
    let topTower = null;
    for (let i = 0; i < towers.length; i += 1) {
      const tower = towers[i];
      if (!this.hitTestTower(tower, worldX, worldY)) continue;
      if (!topTower || compareTowerDrawOrder(tower, topTower) > 0) topTower = tower;
    }
    return topTower;
  }

  hitTestTower(tower, worldX, worldY) {
    const sprite = getTowerSpriteConfig(tower.config, tower.castleId || "human", tower.level || 0);
    const image = !tower.isBuilding && sprite?.imageSrc ? this.images.get(sprite.imageSrc)?.image : null;

    if (image && image.complete && image.naturalWidth > 0) {
      const drawWidth = sprite.drawWidth || 56;
      const drawHeight = sprite.drawHeight || (drawWidth * image.naturalHeight) / image.naturalWidth;
      const anchorY = sprite.anchorY ?? 0.78;
      const left = tower.x - drawWidth / 2;
      const top = tower.y - drawHeight * anchorY;
      if (worldX < left || worldX > left + drawWidth || worldY < top || worldY > top + drawHeight) return false;

      const sourceX = Math.floor(((worldX - left) / drawWidth) * image.naturalWidth);
      const sourceY = Math.floor(((worldY - top) / drawHeight) * image.naturalHeight);
      return this.sampleImageAlpha(image, sourceX, sourceY) > 32;
    }

    const halfWidth = tower.isBuilding ? 26 : 24;
    const top = tower.y - (tower.isBuilding ? 40 : 34);
    const bottom = tower.y + (tower.isBuilding ? 24 : 22);
    return worldX >= tower.x - halfWidth && worldX <= tower.x + halfWidth && worldY >= top && worldY <= bottom;
  }

  hitTestEnemyAt(enemies, worldX, worldY) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      if (enemy.active && this.hitTestEnemy(enemy, worldX, worldY)) return enemy;
    }
    return null;
  }

  hitTestEnemy(enemy, worldX, worldY) {
    const animations = enemy.animations;
    const animation = animations?.[enemy.animationState] || animations?.run || animations?.idle;
    const image = animation?.imageSrc ? this.images.get(animation.imageSrc)?.image : null;

    if (image && image.complete && image.naturalWidth > 0) {
      const frameCount = animation.frames || 1;
      const frameWidth = animation.frameWidth || Math.floor(image.naturalWidth / frameCount);
      const frameHeight = animation.frameHeight || image.naturalHeight;
      const frameIndex = Math.floor(enemy.animationTime * (animation.fps || 8)) % frameCount;
      const drawWidth = animation.drawWidth || enemy.radius * 4;
      const drawHeight = animation.drawHeight || (drawWidth * frameHeight) / frameWidth;
      const anchorY = animation.anchorY ?? 0.8;
      const localX = animation.flipX !== false && enemy.facingX < 0 ? enemy.x - worldX : worldX - enemy.x;
      const localY = worldY - enemy.y;
      const left = -drawWidth / 2;
      const top = -drawHeight * anchorY;
      if (localX < left || localX > left + drawWidth || localY < top || localY > top + drawHeight) return false;

      const sourceX = frameIndex * frameWidth + Math.floor(((localX - left) / drawWidth) * frameWidth);
      const sourceY = Math.floor(((localY - top) / drawHeight) * frameHeight);
      return this.sampleImageAlpha(image, sourceX, sourceY) > 32;
    }

    const dx = worldX - enemy.x;
    const dy = worldY - enemy.y;
    return dx * dx + dy * dy <= Math.max(18, enemy.radius * 1.5) ** 2;
  }

  sampleImageAlpha(image, sourceX, sourceY) {
    if (sourceX < 0 || sourceY < 0 || sourceX >= image.naturalWidth || sourceY >= image.naturalHeight) return 0;
    if (!this.hitTestCanvas) {
      this.hitTestCanvas = this.createStaticCanvas(1, 1);
      this.hitTestCtx = this.hitTestCanvas.getContext("2d");
    }

    const ctx = this.hitTestCtx;
    ctx.clearRect(0, 0, 1, 1);
    try {
      ctx.drawImage(image, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data[3];
    } catch {
      return 255;
    }
  }

  drawTowerLevel(ctx, tower, x, y) {
    ctx.fillStyle = "#f9efd8";
    ctx.strokeStyle = "rgba(35, 24, 15, 0.78)";
    ctx.lineWidth = 3;
    ctx.font = "bold 14px Trebuchet MS, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(`${tower.level + 1}`, x, y);
    ctx.fillText(`${tower.level + 1}`, x, y);
  }

  drawTowerConstruction(ctx, tower) {
    const progress = Math.max(0, Math.min(1, tower.buildProgress || 0));
    const scale = 1.45;
    const height = 44 * scale;
    const builtHeight = height * progress;

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 32, 11, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#6b5338";
    ctx.fillRect(-26, 10, 52, 14);
    ctx.fillStyle = "#3b2b1e";
    ctx.fillRect(-22, 17, 44, 7);

    ctx.strokeStyle = "#d3a85f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-25, 16);
    ctx.lineTo(-17, -35);
    ctx.moveTo(25, 16);
    ctx.lineTo(17, -35);
    ctx.moveTo(-31, 0);
    ctx.lineTo(31, -22);
    ctx.moveTo(-31, -20);
    ctx.lineTo(31, 2);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(-34, 24 - builtHeight, 68, builtHeight);
    ctx.clip();
    ctx.fillStyle = tower.config.color;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(-20, -32, 40, 58);
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(29, 0);
    ctx.lineTo(-29, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 230, 156, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 21, 34, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    ctx.stroke();
  }

  drawEnemy(ctx, enemy, game) {
    if (!enemy.active) return;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (this.drawEnemySprite(ctx, enemy, game)) {
      ctx.restore();
      this.drawCalls += 1;
      return;
    }

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.78, enemy.radius * 1.1, enemy.radius * 0.38, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = enemy.slowTimer > 0 ? "#aeeeff" : "#2b2118";
    ctx.lineWidth = enemy.traits.includes("boss") ? 3 : 2;

    if (enemy.sprite === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.closePath();
    } else if (enemy.sprite === "hex" || enemy.sprite === "boss") {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (TAU / 6) * i + Math.PI / 6;
        const x = Math.cos(angle) * enemy.radius;
        const y = Math.sin(angle) * enemy.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();

    this.drawEnemyStatus(ctx, enemy);
    this.drawEnemyHpBar(ctx, enemy, -enemy.radius - 10, enemy.radius * 2);
    ctx.restore();
    this.drawCalls += 1;
  }

  drawEnemySprite(ctx, enemy, game) {
    const animations = enemy.animations;
    if (!animations) return false;

    const state = game?.state === "paused" && animations.idle ? "idle" : enemy.animationState;
    const animation = animations[state] || animations.run || animations.idle;
    const image = animation?.imageSrc ? this.images.get(animation.imageSrc)?.image : null;
    if (!image || !image.complete || image.naturalWidth <= 0) return false;

    const frameCount = animation.frames || 1;
    const frameWidth = animation.frameWidth || Math.floor(image.naturalWidth / frameCount);
    const frameHeight = animation.frameHeight || image.naturalHeight;
    const frameIndex = Math.floor(enemy.animationTime * (animation.fps || 8)) % frameCount;
    const drawWidth = animation.drawWidth || enemy.radius * 4;
    const drawHeight = animation.drawHeight || (drawWidth * frameHeight) / frameWidth;
    const anchorY = animation.anchorY ?? 0.8;
    const sourceX = frameIndex * frameWidth;

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.78, enemy.radius * 1.45, enemy.radius * 0.38, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    if (animation.flipX !== false && enemy.facingX < 0) ctx.scale(-1, 1);
    ctx.drawImage(image, sourceX, 0, frameWidth, frameHeight, -drawWidth / 2, -drawHeight * anchorY, drawWidth, drawHeight);
    ctx.restore();

    if (enemy.slowTimer > 0) {
      ctx.strokeStyle = "#aeeeff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -enemy.radius * 0.2, enemy.radius * 1.5, enemy.radius, 0, 0, TAU);
      ctx.stroke();
    }

    this.drawEnemyStatus(ctx, enemy);

    this.drawEnemyHpBar(ctx, enemy, -drawHeight * anchorY - 7, Math.max(enemy.radius * 2, drawWidth * 0.54));
    return true;
  }

  drawEnemyStatus(ctx, enemy) {
    if (enemy.poisonTimer > 0) {
      ctx.strokeStyle = "#80df68";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -enemy.radius * 0.15, enemy.radius * 1.35, 0, TAU);
      ctx.stroke();
    }
    if (enemy.rootTimer > 0) {
      ctx.strokeStyle = "#78b45f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-enemy.radius * 1.1, enemy.radius * 0.65);
      ctx.lineTo(enemy.radius * 1.1, enemy.radius * 0.65);
      ctx.stroke();
    }
    if (enemy.vulnerabilityTimer > 0) {
      ctx.strokeStyle = "#ff9c7a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.55, 0, TAU);
      ctx.stroke();
    }
  }

  drawEnemyHpBar(ctx, enemy, y, width) {
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = "#221b16";
    ctx.fillRect(-width / 2, y, width, 4);
    ctx.fillStyle = hpRatio > 0.45 ? "#72d36b" : hpRatio > 0.2 ? "#ffd564" : "#ef6158";
    ctx.fillRect(-width / 2, y, width * hpRatio, 4);
  }

  drawProjectile(ctx, projectile) {
    if (!projectile.active) return;
    if (this.drawProjectileSprite(ctx, projectile)) {
      this.drawCalls += 1;
      return;
    }

    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, TAU);
    ctx.fill();
    this.drawCalls += 1;
  }

  drawProjectileSprite(ctx, projectile) {
    const sprite = projectile.sprite;
    const image = sprite?.imageSrc ? this.images.get(sprite.imageSrc)?.image : null;
    if (!image || !image.complete || image.naturalWidth <= 0) return false;

    const drawWidth = sprite.drawWidth || projectile.radius * 4;
    const drawHeight = sprite.drawHeight || (drawWidth * image.naturalHeight) / image.naturalWidth;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle || 0);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  drawEffect(ctx, effect) {
    if (!effect.active) return;
    const alpha = effect.alpha;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (effect.type === "ring") {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.1 - alpha * 0.25), 0, TAU);
      ctx.stroke();
    } else if (effect.type === "beam") {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.x2, effect.y2);
      ctx.stroke();
    } else if (effect.type === "text") {
      ctx.fillStyle = effect.color;
      ctx.font = "bold 16px Trebuchet MS, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(effect.text, effect.x, effect.y);
    }
    ctx.restore();
  }

  drawPerf(ctx, game) {
    const lines = [
      `FPS ${game.fps.toFixed(0)}`,
      `Enemies ${game.enemies.length}`,
      `Projectiles ${game.projectiles.length}`,
      `Draw ${this.drawCalls}`,
    ];
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(10, 10, 150, 82);
    ctx.fillStyle = "#d8ffbd";
    ctx.font = "12px Consolas, monospace";
    ctx.textBaseline = "top";
    for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], 18, 18 + i * 16);
    ctx.restore();
  }
}
