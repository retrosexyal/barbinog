import { MAP_CONFIG } from "../config/map.js";
import { TAU } from "../utils/math.js";

function hash2(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
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
    const ctx = this.ctx;
    this.drawCalls = 0;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#0f130e";
    ctx.fillRect(0, 0, this.width, this.height);

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

  drawWorld(ctx, game) {
    this.drawMap(ctx, game);
    this.drawRanges(ctx, game);
    for (let i = 0; i < game.towers.length; i += 1) this.drawTower(ctx, game.towers[i]);
    for (let i = 0; i < game.projectiles.length; i += 1) this.drawProjectile(ctx, game.projectiles[i]);
    for (let i = 0; i < game.enemies.length; i += 1) this.drawEnemy(ctx, game.enemies[i], game);
    for (let i = 0; i < game.effects.length; i += 1) this.drawEffect(ctx, game.effects[i]);
  }

  drawMap(ctx, game) {
    const map = game.map;
    const tile = map.tileSize;
    ctx.fillStyle = "#2e4a25";
    ctx.fillRect(0, 0, map.width * tile, map.height * tile);
    this.drawCalls += 1;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const h = hash2(x, y);
        const shade = 38 + (h % 20);
        ctx.fillStyle = `rgb(${shade}, ${68 + (h % 22)}, ${33 + (h % 14)})`;
        ctx.fillRect(x * tile, y * tile, tile, tile);
        if (!map.isPathTile(x, y) && !map.isBuildableTile(x, y)) {
          if (h % 7 === 0) this.drawTree(ctx, x * tile + 24, y * tile + 28, 0.85 + (h % 4) * 0.08);
          if (h % 13 === 0) this.drawStone(ctx, x * tile + 16 + (h % 18), y * tile + 18 + (h % 16));
        }
      }
    }

    this.drawPath(ctx, game.path);
    this.drawBuildPads(ctx, game);
    this.drawBase(ctx, map);
    this.drawSpawn(ctx, map);
  }

  drawPath(ctx, path) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i += 1) ctx.lineTo(path.points[i].x, path.points[i].y);
    ctx.lineWidth = MAP_CONFIG.tileSize * 0.96;
    ctx.strokeStyle = "#6e5637";
    ctx.stroke();
    ctx.lineWidth = MAP_CONFIG.tileSize * 0.78;
    ctx.strokeStyle = "#d9bd86";
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 18]);
    ctx.strokeStyle = "rgba(94, 70, 42, 0.42)";
    ctx.stroke();
    ctx.setLineDash([]);
    this.drawPathArrows(ctx, path);
    ctx.restore();
    this.drawCalls += 3;
  }

  drawPathArrows(ctx, path) {
    ctx.fillStyle = "rgba(102, 75, 42, 0.55)";
    for (let i = 0; i < path.segments.length; i += 1) {
      const segment = path.segments[i];
      const step = 150;
      for (let d = segment.start + 72; d < segment.end - 36; d += step) {
        const t = (d - segment.start) / segment.len;
        const x = segment.ax + segment.dx * t;
        const y = segment.ay + segment.dy * t;
        const angle = Math.atan2(segment.dy, segment.dx);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawBuildPads(ctx, game) {
    const map = game.map;
    const tile = map.tileSize;
    for (let i = 0; i < map.buildableTiles.length; i += 1) {
      const { x, y } = map.buildableTiles[i];
      const px = x * tile;
      const py = y * tile;
      const canBuild = map.canBuildAt(x, y);
      const highlight = game.selectedTowerType && game.isRunState();
      ctx.fillStyle = highlight ? (canBuild ? "rgba(115, 173, 83, 0.65)" : "rgba(120, 76, 61, 0.45)") : "#b7a06c";
      ctx.fillRect(px + 4, py + 4, tile - 8, tile - 8);
      ctx.strokeStyle = "rgba(67, 48, 27, 0.6)";
      ctx.strokeRect(px + 4, py + 4, tile - 8, tile - 8);
    }
    if (game.hoverTile && map.isInBounds(game.hoverTile.x, game.hoverTile.y)) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = map.canBuildAt(game.hoverTile.x, game.hoverTile.y) ? "#e8f39a" : "#f37d69";
      ctx.strokeRect(game.hoverTile.x * tile + 3, game.hoverTile.y * tile + 3, tile - 6, tile - 6);
    }
    this.drawCalls += map.buildableTiles.length;
  }

  drawBase(ctx, map) {
    const center = map.tileCenter(map.basePosition.x, map.basePosition.y);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.fillStyle = "#4c4a48";
    ctx.fillRect(-44, -36, 88, 72);
    ctx.fillStyle = "#2b2f36";
    ctx.fillRect(-30, -54, 60, 22);
    ctx.fillStyle = "#55bfff";
    ctx.beginPath();
    ctx.moveTo(0, -72);
    ctx.lineTo(20, -34);
    ctx.lineTo(-20, -34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.strokeRect(-44, -36, 88, 72);
    ctx.restore();
    this.drawCalls += 1;
  }

  drawSpawn(ctx, map) {
    const center = map.tileCenter(0, map.spawnPosition.y);
    ctx.save();
    ctx.translate(center.x - map.tileSize * 0.5, center.y);
    ctx.fillStyle = "#2a1c18";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ff8c47";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  drawRanges(ctx, game) {
    let tower = game.selectedTower;
    if (!tower && game.hoverTile) tower = game.getTowerAtTile(game.hoverTile.x, game.hoverTile.y);
    if (!tower) return;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, TAU);
    ctx.fillStyle = "rgba(105, 178, 217, 0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(188, 226, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTower(ctx, tower) {
    ctx.save();
    ctx.translate(tower.x, tower.y);
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

    this.drawEnemyHpBar(ctx, enemy, -drawHeight * anchorY - 7, Math.max(enemy.radius * 2, drawWidth * 0.54));
    return true;
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
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, TAU);
    ctx.fill();
    this.drawCalls += 1;
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

  drawTree(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#2c2117";
    ctx.fillRect(-3, 2, 6, 14);
    ctx.fillStyle = "#1d4f2b";
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18, 8);
    ctx.lineTo(-18, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2f6b36";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(15, 15);
    ctx.lineTo(-15, 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawStone(ctx, x, y) {
    ctx.fillStyle = "#6f7565";
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 6, -0.2, 0, TAU);
    ctx.fill();
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
