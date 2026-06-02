import { MAP_CONFIG } from "../config/map.js";
import { TAU } from "../utils/math.js";

function hash2(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

function rand01(x, y, salt = 0) {
  return (hash2(x + salt * 1013, y - salt * 917) & 0xffff) / 0xffff;
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
    const background = this.getMapBackground(map, game.path);
    ctx.drawImage(background, 0, 0);
    this.drawCalls += 1;

    this.drawBuildPads(ctx, game);
  }

  getMapBackground(map, path) {
    const tile = map.tileSize;
    const width = map.width * tile;
    const height = map.height * tile;
    const pathKey = path.points.map((point) => `${point.x},${point.y}`).join(";");
    const buildKey = map.buildableTiles.map((point) => `${point.x},${point.y}`).join(";");
    const endpointKey = `${map.spawnPosition.x},${map.spawnPosition.y}:${map.basePosition.x},${map.basePosition.y}`;
    const key = `${width}x${height}:${tile}:${endpointKey}:${pathKey}:${buildKey}`;

    if (!this.mapBackground || this.mapBackgroundKey !== key) {
      const canvas = this.createStaticCanvas(width, height);
      const bg = canvas.getContext("2d");
      const previousDrawCalls = this.drawCalls;
      this.drawStaticMap(bg, map, path);
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

  drawStaticMap(ctx, map, path) {
    this.drawForestGround(ctx, map);
    this.drawTerrainDecorations(ctx, map, "back");
    this.drawPath(ctx, path);
    this.drawTerrainDecorations(ctx, map, "front");
    this.drawBase(ctx, map);
    this.drawSpawn(ctx, map);
  }

  drawForestGround(ctx, map) {
    const tile = map.tileSize;
    const width = map.width * tile;
    const height = map.height * tile;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#3f5d26");
    gradient.addColorStop(0.42, "#2f4f24");
    gradient.addColorStop(1, "#223b1d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const px = x * tile;
        const py = y * tile;
        const h = hash2(x, y);
        const warm = h % 3 === 0;
        ctx.fillStyle = warm ? "rgba(112, 116, 45, 0.07)" : "rgba(25, 75, 38, 0.08)";
        ctx.fillRect(px - 4, py - 4, tile + 8, tile + 8);

        for (let i = 0; i < 3; i += 1) {
          const rx = px + rand01(x, y, i) * tile;
          const ry = py + rand01(x, y, i + 8) * tile;
          const rw = 9 + rand01(x, y, i + 16) * 20;
          const rh = 4 + rand01(x, y, i + 24) * 12;
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate((rand01(x, y, i + 32) - 0.5) * 0.9);
          ctx.fillStyle = i === 0 ? "rgba(177, 153, 65, 0.12)" : "rgba(98, 132, 48, 0.18)";
          ctx.beginPath();
          ctx.ellipse(0, 0, rw, rh, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        if (!map.isPathTile(x, y) && h % 5 === 0) {
          this.drawGrassTuft(ctx, px + 8 + (h % 31), py + 10 + ((h >>> 4) % 29), 0.65 + (h % 5) * 0.08);
        }
        if (!map.isPathTile(x, y) && h % 17 === 0) {
          this.drawFlowers(ctx, px + 12 + (h % 25), py + 16 + ((h >>> 5) % 23), h);
        }
      }
    }

    for (let i = 0; i < 46; i += 1) {
      const h = hash2(i + 41, i * 7 + 13);
      const x = rand01(i, h, 1) * width;
      const y = rand01(i, h, 2) * height;
      const rw = 28 + rand01(i, h, 3) * 62;
      const rh = 14 + rand01(i, h, 4) * 32;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand01(i, h, 5) - 0.5) * 1.2);
      ctx.fillStyle = i % 4 === 0 ? "rgba(168, 142, 60, 0.08)" : "rgba(31, 82, 37, 0.11)";
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, width * 0.18, width * 0.5, height * 0.5, height * 0.72);
    vignette.addColorStop(0, "rgba(255,255,255,0)");
    vignette.addColorStop(1, "rgba(12,16,10,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  drawPath(ctx, path) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i += 1) ctx.lineTo(path.points[i].x, path.points[i].y);
    ctx.lineWidth = MAP_CONFIG.tileSize * 1.2;
    ctx.strokeStyle = "rgba(26, 35, 17, 0.58)";
    ctx.stroke();
    ctx.lineWidth = MAP_CONFIG.tileSize * 1.06;
    ctx.strokeStyle = "#566f2f";
    ctx.stroke();
    ctx.lineWidth = MAP_CONFIG.tileSize * 0.98;
    ctx.strokeStyle = "#806537";
    ctx.stroke();
    ctx.lineWidth = MAP_CONFIG.tileSize * 0.82;
    ctx.strokeStyle = "#d8bd83";
    ctx.stroke();
    ctx.lineWidth = MAP_CONFIG.tileSize * 0.56;
    ctx.strokeStyle = "rgba(238, 211, 151, 0.28)";
    ctx.stroke();
    this.drawPathTexture(ctx, path);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([20, 18]);
    ctx.strokeStyle = "rgba(93, 68, 39, 0.36)";
    ctx.stroke();
    ctx.setLineDash([]);
    this.drawPathArrows(ctx, path);
    ctx.restore();
    this.drawCalls += 3;
  }

  drawPathTexture(ctx, path) {
    const tile = MAP_CONFIG.tileSize;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < path.segments.length; i += 1) {
      const segment = path.segments[i];
      const nx = -segment.dy / segment.len;
      const ny = segment.dx / segment.len;
      const tx = segment.dx / segment.len;
      const ty = segment.dy / segment.len;
      for (let d = segment.start + 16; d < segment.end - 10; d += 18) {
        const local = d - segment.start;
        const t = local / segment.len;
        const seedX = Math.floor(segment.ax + segment.dx * t);
        const seedY = Math.floor(segment.ay + segment.dy * t);
        const offset = (rand01(seedX, seedY, i) - 0.5) * tile * 0.58;
        const x = segment.ax + segment.dx * t + nx * offset;
        const y = segment.ay + segment.dy * t + ny * offset;

        if (rand01(seedX, seedY, i + 3) > 0.38) {
          const len = 5 + rand01(seedX, seedY, i + 6) * 12;
          const lean = (rand01(seedX, seedY, i + 9) - 0.5) * 0.8;
          ctx.strokeStyle = "rgba(115, 82, 44, 0.2)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x - tx * len * 0.5 + nx * lean * 5, y - ty * len * 0.5 + ny * lean * 5);
          ctx.lineTo(x + tx * len * 0.5 - nx * lean * 5, y + ty * len * 0.5 - ny * lean * 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = rand01(seedX, seedY, i + 11) > 0.5 ? "rgba(93, 77, 53, 0.34)" : "rgba(236, 212, 159, 0.34)";
          ctx.beginPath();
          ctx.ellipse(x, y, 1.9, 1.2, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  drawPathArrows(ctx, path) {
    ctx.fillStyle = "rgba(104, 76, 42, 0.52)";
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
        ctx.moveTo(19, 0);
        ctx.lineTo(-11, -10);
        ctx.lineTo(-4, -1);
        ctx.lineTo(-13, -1);
        ctx.lineTo(-13, 1);
        ctx.lineTo(-4, 1);
        ctx.lineTo(-11, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawBuildStoneTile(ctx, map, x, y) {
    const tile = map.tileSize;
    const px = x * tile;
    const py = y * tile;
    const h = hash2(x, y);
    const inset = 4;
    const shade = h % 12;
    ctx.fillStyle = `rgb(${184 + shade}, ${158 + Math.floor(shade * 0.55)}, ${100 + Math.floor(shade * 0.4)})`;
    ctx.fillRect(px + inset, py + inset, tile - inset * 2, tile - inset * 2);

    ctx.fillStyle = "rgba(241, 219, 160, 0.35)";
    ctx.fillRect(px + inset + 2, py + inset + 2, tile - inset * 2 - 4, 3);
    ctx.fillStyle = "rgba(79, 56, 32, 0.2)";
    ctx.fillRect(px + inset + 2, py + tile - inset - 5, tile - inset * 2 - 4, 3);

    ctx.strokeStyle = "rgba(87, 63, 38, 0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + inset, py + inset, tile - inset * 2, tile - inset * 2);

    ctx.strokeStyle = "rgba(56, 42, 27, 0.42)";
    ctx.lineWidth = 3;
    if (!map.isBuildableTile(x, y - 1)) {
      ctx.beginPath();
      ctx.moveTo(px + inset, py + inset);
      ctx.lineTo(px + tile - inset, py + inset);
      ctx.stroke();
    }
    if (!map.isBuildableTile(x, y + 1)) {
      ctx.beginPath();
      ctx.moveTo(px + inset, py + tile - inset);
      ctx.lineTo(px + tile - inset, py + tile - inset);
      ctx.stroke();
    }
    if (!map.isBuildableTile(x - 1, y)) {
      ctx.beginPath();
      ctx.moveTo(px + inset, py + inset);
      ctx.lineTo(px + inset, py + tile - inset);
      ctx.stroke();
    }
    if (!map.isBuildableTile(x + 1, y)) {
      ctx.beginPath();
      ctx.moveTo(px + tile - inset, py + inset);
      ctx.lineTo(px + tile - inset, py + tile - inset);
      ctx.stroke();
    }
  }

  drawBuildPads(ctx, game) {
    const showPads = !!game.selectedTowerType && game.isRunState();
    if (!showPads) return;

    const map = game.map;
    const tile = map.tileSize;
    for (let i = 0; i < map.buildableTiles.length; i += 1) {
      const { x, y } = map.buildableTiles[i];
      this.drawBuildStoneTile(ctx, map, x, y);

      const px = x * tile;
      const py = y * tile;
      const canBuild = map.canBuildAt(x, y);
      ctx.fillStyle = canBuild ? "rgba(213, 235, 113, 0.22)" : "rgba(135, 67, 54, 0.24)";
      ctx.fillRect(px + 6, py + 6, tile - 12, tile - 12);
      ctx.strokeStyle = canBuild ? "rgba(242, 236, 143, 0.84)" : "rgba(231, 105, 82, 0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 5, py + 5, tile - 10, tile - 10);
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
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 58, 19, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#564d42";
    ctx.fillRect(-48, -25, 96, 54);
    ctx.fillStyle = "#3b352f";
    ctx.fillRect(-42, 4, 84, 27);
    ctx.strokeStyle = "#211a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(-48, -25, 96, 54);

    for (let i = -2; i <= 2; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#777064" : "#696257";
      ctx.fillRect(i * 19 - 8, -39, 16, 18);
      ctx.strokeStyle = "rgba(34, 25, 17, 0.55)";
      ctx.strokeRect(i * 19 - 8, -39, 16, 18);
    }

    ctx.fillStyle = "#2b2119";
    ctx.beginPath();
    ctx.moveTo(-18, 31);
    ctx.lineTo(-18, 8);
    ctx.quadraticCurveTo(0, -7, 18, 8);
    ctx.lineTo(18, 31);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#4a8fd3";
    ctx.beginPath();
    ctx.moveTo(0, -75);
    ctx.lineTo(19, -38);
    ctx.lineTo(6, -21);
    ctx.lineTo(-16, -36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(172, 232, 255, 0.72)";
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(6, -38);
    ctx.lineTo(-5, -43);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f29b49";
    for (const sx of [-42, 42]) {
      ctx.fillRect(sx - 4, -2, 8, 31);
      ctx.beginPath();
      ctx.arc(sx, -5, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffd266";
      ctx.beginPath();
      ctx.arc(sx, -7, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f29b49";
    }
    ctx.restore();
    this.drawCalls += 1;
  }

  drawSpawn(ctx, map) {
    const center = map.tileCenter(map.spawnPosition.x, map.spawnPosition.y);
    ctx.save();
    ctx.translate(center.x - map.tileSize * 0.5, center.y);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 46, 16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#31231b";
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#74614a";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "#231813";
    ctx.lineWidth = 2;
    ctx.stroke();

    const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 31);
    glow.addColorStop(0, "#ffcf68");
    glow.addColorStop(0.48, "#d8442f");
    glow.addColorStop(1, "rgba(90, 18, 18, 0.15)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 229, 134, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0.4, TAU * 0.82);
    ctx.stroke();

    for (const sx of [-31, 31]) {
      ctx.fillStyle = "#61564b";
      ctx.fillRect(sx - 7, -30, 14, 58);
      ctx.fillStyle = "#3f372f";
      ctx.fillRect(sx - 9, -35, 18, 12);
    }
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

    if (tower.isBuilding) {
      this.drawTowerConstruction(ctx, tower);
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

  drawTowerConstruction(ctx, tower) {
    const progress = Math.max(0, Math.min(1, tower.buildProgress || 0));
    const height = 44;
    const builtHeight = height * progress;

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 22, 8, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#6b5338";
    ctx.fillRect(-18, 8, 36, 10);
    ctx.fillStyle = "#3b2b1e";
    ctx.fillRect(-15, 13, 30, 5);

    ctx.strokeStyle = "#d3a85f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-17, 12);
    ctx.lineTo(-12, -24);
    ctx.moveTo(17, 12);
    ctx.lineTo(12, -24);
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, -15);
    ctx.moveTo(-22, -14);
    ctx.lineTo(22, 1);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(-24, 18 - builtHeight, 48, builtHeight);
    ctx.clip();
    ctx.fillStyle = tower.config.color;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(-14, -22, 28, 40);
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 230, 156, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 16, 24, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
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

  drawTerrainDecorations(ctx, map, layer) {
    const tile = map.tileSize;
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        if (map.isPathTile(x, y)) continue;

        const h = hash2(x, y);
        const px = x * tile;
        const py = y * tile;
        const cx = px + 16 + (h % 28);
        const cy = py + 16 + ((h >>> 5) % 28);
        const buildable = map.isBuildableTile(x, y);

        if (buildable) {
          if (layer === "front" && h % 9 === 0) {
            this.drawGrassTuft(ctx, px + 10 + (h % 27), py + 16 + ((h >>> 4) % 24), 0.56 + (h % 3) * 0.08);
          }
          continue;
        }

        if (layer === "back") {
          if (h % 23 === 0) this.drawRuinCluster(ctx, cx, cy, 0.78 + (h % 4) * 0.1, h);
          if (h % 29 === 0) this.drawFallenLog(ctx, px + 14 + (h % 18), py + 24 + ((h >>> 4) % 16), h);
          if (h % 19 === 0) this.drawStoneCluster(ctx, cx, cy, 0.75 + (h % 4) * 0.09, h);
        } else {
          if (h % 11 === 0) this.drawTree(ctx, px + 24 + ((h >>> 4) % 13) - 6, py + 32 + ((h >>> 8) % 11), 0.82 + (h % 5) * 0.08);
          else if (h % 17 === 0) this.drawShrub(ctx, cx, cy, 0.8 + (h % 4) * 0.08, h);
          if (h % 31 === 0) this.drawStoneCluster(ctx, cx, cy + 6, 0.6 + (h % 3) * 0.12, h);
        }
      }
    }
  }

  drawTree(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 19, 7, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#3b2617";
    ctx.fillRect(-4, 0, 8, 21);
    ctx.fillStyle = "#251a11";
    ctx.fillRect(1, 2, 3, 18);

    ctx.fillStyle = "#183f23";
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(22, -1);
    ctx.lineTo(-22, -1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#24582e";
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(25, 11);
    ctx.lineTo(-25, 11);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#356f37";
    ctx.beginPath();
    ctx.moveTo(-3, -30);
    ctx.lineTo(8, -5);
    ctx.lineTo(-16, -4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(119, 151, 68, 0.38)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -7);
    ctx.lineTo(0, -23);
    ctx.lineTo(13, 7);
    ctx.stroke();
    ctx.restore();
  }

  drawStone(ctx, x, y) {
    ctx.fillStyle = "#6f7565";
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 6, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(210, 213, 184, 0.32)";
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 2, 3, 2, -0.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(44, 48, 41, 0.48)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 6, -0.2, 0, TAU);
    ctx.stroke();
  }

  drawStoneCluster(ctx, x, y, scale, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    for (let i = 0; i < 3; i += 1) {
      const ox = (rand01(seed, i, 1) - 0.5) * 24;
      const oy = (rand01(seed, i, 2) - 0.5) * 13;
      const w = 7 + rand01(seed, i, 3) * 9;
      const h = 5 + rand01(seed, i, 4) * 7;
      ctx.fillStyle = i === 0 ? "#73786a" : "#5f675d";
      ctx.beginPath();
      ctx.ellipse(ox, oy, w, h, rand01(seed, i, 5) - 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(217, 220, 191, 0.24)";
      ctx.beginPath();
      ctx.ellipse(ox - w * 0.25, oy - h * 0.25, w * 0.28, h * 0.28, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRuinCluster(ctx, x, y, scale, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(3, 13, 27, 8, 0, 0, TAU);
    ctx.fill();

    const columns = 2 + (seed % 3);
    for (let i = 0; i < columns; i += 1) {
      const height = 21 + rand01(seed, i, 1) * 24;
      const ox = -19 + i * 13 + (rand01(seed, i, 2) - 0.5) * 5;
      const top = 12 - height;
      ctx.fillStyle = i % 2 === 0 ? "#74776b" : "#62675f";
      ctx.fillRect(ox, top, 9, height);
      ctx.fillStyle = "rgba(219, 220, 194, 0.28)";
      ctx.fillRect(ox + 1, top + 2, 3, height - 4);
      ctx.strokeStyle = "rgba(42, 45, 39, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, top, 9, height);

      if (rand01(seed, i, 3) > 0.45) {
        ctx.fillStyle = "#8a897b";
        ctx.fillRect(ox - 3, top - 5, 15, 7);
        ctx.strokeRect(ox - 3, top - 5, 15, 7);
      }
    }

    this.drawGrassTuft(ctx, -13, 16, 0.7);
    this.drawGrassTuft(ctx, 18, 15, 0.55);
    ctx.restore();
  }

  drawFallenLog(ctx, x, y, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand01(seed, 4, 1) - 0.5) * 1.1);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 22, 6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#5e3f22";
    ctx.fillRect(-21, -4, 42, 8);
    ctx.fillStyle = "#7d552e";
    ctx.fillRect(-20, -5, 39, 3);
    ctx.strokeStyle = "#2e2015";
    ctx.lineWidth = 2;
    ctx.strokeRect(-21, -4, 42, 8);
    ctx.strokeStyle = "rgba(222, 170, 91, 0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-17, -1);
    ctx.lineTo(14, -1);
    ctx.moveTo(-12, 3);
    ctx.lineTo(19, 3);
    ctx.stroke();
    ctx.restore();
  }

  drawShrub(ctx, x, y, scale, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    for (let i = 0; i < 5; i += 1) {
      const ox = (rand01(seed, i, 1) - 0.5) * 22;
      const oy = (rand01(seed, i, 2) - 0.5) * 13;
      ctx.fillStyle = i % 2 === 0 ? "#315d2d" : "#456f35";
      ctx.beginPath();
      ctx.ellipse(ox, oy, 10, 7, (rand01(seed, i, 3) - 0.5) * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawGrassTuft(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "rgba(112, 154, 58, 0.58)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.lineTo(-11, -3);
    ctx.moveTo(-3, 5);
    ctx.lineTo(-3, -8);
    ctx.moveTo(1, 5);
    ctx.lineTo(7, -5);
    ctx.moveTo(5, 5);
    ctx.lineTo(12, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawFlowers(ctx, x, y, seed) {
    const colors = ["#d6c45c", "#b8d8e7", "#d8894b"];
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = colors[(seed + i) % colors.length];
      ctx.beginPath();
      ctx.arc(x + (rand01(seed, i, 1) - 0.5) * 20, y + (rand01(seed, i, 2) - 0.5) * 14, 1.7, 0, TAU);
      ctx.fill();
    }
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
