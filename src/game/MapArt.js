const SHARED_MAP_ART_ASSETS = Object.freeze({
  pathFill: new URL("../assets/map/path-fill-human.png", import.meta.url).href,
  portal: new URL("../assets/map/portal.png", import.meta.url).href,
  base: new URL("../assets/map/base_2.png", import.meta.url).href,
  tree: new URL("../assets/map/tree.png", import.meta.url).href,
  pine: new URL("../assets/map/pine.png", import.meta.url).href,
  rocks: new URL("../assets/map/rocks.png", import.meta.url).href,
  ruins: new URL("../assets/map/ruins.png", import.meta.url).href,
  angel: new URL("../assets/map/angel.png", import.meta.url).href,
  water: new URL("../assets/map/water.png", import.meta.url).href,
});

export const MAP_ART_ASSET_SETS = Object.freeze({
  human: Object.freeze({
    ...SHARED_MAP_ART_ASSETS,
    background: Object.freeze({
      horizontal: new URL("../assets/map/bg_human.webp", import.meta.url).href,
      vertical: new URL("../assets/map/bg_human_vertical.jpeg", import.meta.url).href,
    }),
  }),
  elf: Object.freeze({
    ...SHARED_MAP_ART_ASSETS,
    pathFill: new URL("../assets/map/path-fill-elf.png", import.meta.url).href,
    background: Object.freeze({
      horizontal: new URL("../assets/map/bg_elf.webp", import.meta.url).href,
      vertical: new URL("../assets/map/bg_elf_vertical.webp", import.meta.url).href,
    }),
  }),
  undead: Object.freeze({
    ...SHARED_MAP_ART_ASSETS,
    pathFill: new URL("../assets/map/path-fill-undead.png", import.meta.url).href,
    background: Object.freeze({
      horizontal: new URL("../assets/map/bg_undead.webp", import.meta.url).href,
      vertical: new URL("../assets/map/bg_undead_vertical.webp", import.meta.url).href,
    }),
    tree: new URL("../assets/map/tree_undead.png", import.meta.url).href,
    pine: new URL("../assets/map/pine_undead.png", import.meta.url).href,
    rocks: new URL("../assets/map/rocks_undead.png", import.meta.url).href,
    ruins: new URL("../assets/map/ruins_undead.png", import.meta.url).href,
    angel: new URL("../assets/map/angel_undead.png", import.meta.url).href,
    water: new URL("../assets/map/water_undead.png", import.meta.url).href,
  }),
});

function collectAssetSources(value, out) {
  if (!value) return;
  if (typeof value === "string") {
    out.add(value);
    return;
  }
  for (const child of Object.values(value)) {
    collectAssetSources(child, out);
  }
}

function makeAssetList() {
  const sources = new Set();
  collectAssetSources(MAP_ART_ASSET_SETS, sources);
  return [...sources];
}

export const MAP_ART_ASSETS = Object.freeze(makeAssetList());

const BASE_ANIMATION = Object.freeze({
  frames: 6,
  fps: 6,
  sourceY: 0,
  sourceHeight: 300,
  drawWidth: 170,
  drawHeight: 199,
  anchorY: 0.9,
});

function hash2(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

function rand01(x, y, salt = 0) {
  return (hash2(x + salt * 1013, y - salt * 917) & 0xffff) / 0xffff;
}

function tileKey(x, y) {
  return `${x},${y}`;
}

export class MapArt {
  constructor(images) {
    this.images = images;
    this.castleId = "human";
    this.orientation = "horizontal";
    this.assetSet = MAP_ART_ASSET_SETS.human;
    this.themeKey = "human:horizontal";
  }

  setTheme(castleId, viewportWidth, viewportHeight) {
    const nextCastleId = MAP_ART_ASSET_SETS[castleId] ? castleId : "human";
    const nextOrientation = viewportWidth < viewportHeight ? "vertical" : "horizontal";
    const nextThemeKey = `${nextCastleId}:${nextOrientation}`;
    if (nextThemeKey === this.themeKey) return false;

    this.castleId = nextCastleId;
    this.orientation = nextOrientation;
    this.assetSet = MAP_ART_ASSET_SETS[nextCastleId];
    this.themeKey = nextThemeKey;
    return true;
  }

  getStaticThemeKey() {
    return this.castleId;
  }

  drawStaticMap(ctx, map, path, options = {}) {
    if (options.includeBackground !== false) this.drawBackground(ctx, map);
    this.drawPath(ctx, map, path);
    this.drawSparseDecorations(ctx, map, "back");
    this.drawUniqueLandmarks(ctx, map);
    this.drawSparseDecorations(ctx, map, "front");
    this.drawSpawn(ctx, map);
  }

  drawPath(ctx, map, path) {
    const image = this.getImage("pathFill");
    if (!image || !path?.points?.length) return;

    const pattern = ctx.createPattern(image, "repeat");
    if (!pattern) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = map.tileSize * 1.05;
    ctx.strokeStyle = pattern;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i += 1) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  getImage(name) {
    const source = this.getAssetSource(name);
    const image = source ? this.images.get(source)?.image : null;
    return image && image.complete && image.naturalWidth > 0 ? image : null;
  }

  getAssetSource(name) {
    const asset = this.assetSet[name];
    if (typeof asset === "string") return asset;
    if (asset && typeof asset === "object") {
      return asset[this.orientation] || asset.horizontal || asset.vertical || null;
    }
    return null;
  }

  drawBackground(ctx, map) {
    const width = map.width * map.tileSize;
    const height = map.height * map.tileSize;
    const image = this.getImage("background");
    if (image) {
      this.drawCoverImage(ctx, image, 0, 0, width, height);
      return;
    }
    ctx.fillStyle = "#4f672d";
    ctx.fillRect(0, 0, width, height);
  }

  drawUniqueLandmarks(ctx, map) {
    this.drawDecorationLayer(ctx, map, "landmark");
  }

  drawSparseDecorations(ctx, map, layer) {
    this.drawDecorationLayer(ctx, map, layer);
  }

  drawDecorationLayer(ctx, map, layer) {
    const decorations = map.decorations || [];
    for (let i = 0; i < decorations.length; i += 1) {
      const decoration = decorations[i];
      if (decoration.layer !== layer) continue;
      this.drawAtTile(
        ctx,
        map,
        decoration.name,
        decoration.tileX,
        decoration.tileY,
        decoration.width,
        decoration.height,
        decoration.anchorY,
        decoration.alpha,
        decoration.seed,
      );
    }
  }

  canPlaceDecor(map, tileX, tileY, width, height) {
    const tile = map.tileSize;
    const cx = tileX * tile + tile * 0.5;
    const bottom = tileY * tile + tile * 0.9;
    const left = Math.floor((cx - width * 0.45) / tile);
    const right = Math.floor((cx + width * 0.45) / tile);
    const top = Math.floor((bottom - height * 0.78) / tile);
    const endY = Math.floor(bottom / tile);

    for (let y = top; y <= endY; y += 1) {
      for (let x = left; x <= right; x += 1) {
        if (!map.isInBounds(x, y)) return false;
        if (map.isPathTile(x, y)) return false;
        if (tileKey(x, y) === tileKey(map.spawnPosition.x, map.spawnPosition.y))
          return false;
        if (tileKey(x, y) === tileKey(map.basePosition.x, map.basePosition.y))
          return false;
      }
    }
    return true;
  }

  drawBase(ctx, map, time = 0) {
    const center = map.tileCenter(map.basePosition.x, map.basePosition.y);
    const x = center.x + map.tileSize * 0.12;
    const y = center.y + map.tileSize * 0.82;
    if (this.drawAnimatedBase(ctx, x, y, time)) return;
    this.drawAnchoredAsset(ctx, "base", x, y, 164, 200, 0.9);
  }

  drawSpawn(ctx, map) {
    const center = map.tileCenter(map.spawnPosition.x, map.spawnPosition.y);
    this.drawAnchoredAsset(
      ctx,
      "portal",
      center.x - map.tileSize * 0.5,
      center.y + map.tileSize * 0.74,
      140,
      134,
      0.9,
    );
  }

  drawAtTile(
    ctx,
    map,
    name,
    tileX,
    tileY,
    width,
    height,
    anchorY,
    alpha = 1,
    seed = 0,
  ) {
    const tile = map.tileSize;
    const x = tileX * tile + tile * 0.5;
    const y = tileY * tile + tile * 0.9;
    const image = this.getImage(name);
    if (!image) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (seed && rand01(seed, 3, 2) > 0.5) ctx.scale(-1, 1);
    ctx.drawImage(image, -width / 2, -height * anchorY, width, height);
    ctx.restore();
  }

  drawAnchoredAsset(ctx, name, x, y, width, height, anchorY) {
    const image = this.getImage(name);
    if (!image) return;
    ctx.drawImage(image, x - width / 2, y - height * anchorY, width, height);
  }

  drawAnimatedBase(ctx, x, y, time) {
    const image = this.getImage("base");
    if (!image) return false;

    const frameCount = BASE_ANIMATION.frames;
    const frameWidth = Math.floor(image.naturalWidth / frameCount);
    const frameHeight = Math.min(
      BASE_ANIMATION.sourceHeight,
      image.naturalHeight - BASE_ANIMATION.sourceY,
    );
    const frameIndex = Math.floor(time * BASE_ANIMATION.fps) % frameCount;
    const sourceX = frameIndex * frameWidth;

    ctx.drawImage(
      image,
      sourceX,
      BASE_ANIMATION.sourceY,
      frameWidth,
      frameHeight,
      x - BASE_ANIMATION.drawWidth / 2,
      y - BASE_ANIMATION.drawHeight * BASE_ANIMATION.anchorY,
      BASE_ANIMATION.drawWidth,
      BASE_ANIMATION.drawHeight,
    );
    return true;
  }

  drawCoverImage(ctx, image, x, y, width, height) {
    const scale = Math.max(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height,
    );
  }
}
