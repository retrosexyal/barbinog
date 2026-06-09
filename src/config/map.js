const tileSize = 48;
const contentOffsetX = 1;
const width = 18;
const height = 24;
const towerFootprint = Object.freeze({ width: 1, height: 1 });

function sx(x) {
  return x + contentOffsetX;
}

const drawSquare = (
  width = 1,
  height = 1,
  x = 0,
  y = 0,
  isBottom = 1,
  isLeft = 1,
) => [
  { x, y },
  { x: x + width * isLeft, y },
  { x: x + width * isLeft, y: y + height * isBottom },
  { x, y: y + height * isBottom },
  { x, y },
];

const pathWaypoints = [
  { x: sx(0), y: 7 },
  { x: sx(13), y: 7 },
  { x: sx(13), y: 21 },
  { x: sx(5), y: 21 },
  { x: sx(5), y: 2 },
  { x: sx(10), y: 2 },
  { x: sx(10), y: 7 },
  { x: sx(13), y: 7 },
  ...drawSquare(5, 5, sx(13), 21, -1, -1),
  { x: sx(5), y: 21 },
  { x: sx(5), y: 12 },
  { x: sx(9), y: 12 },
];

function key(x, y) {
  return `${x},${y}`;
}

function addTile(set, x, y) {
  if (x >= 0 && y >= 0 && x < width && y < height) set.add(key(x, y));
}

function addRect(set, x, y, w, h) {
  for (let ty = y; ty < y + h; ty += 1) {
    for (let tx = x; tx < x + w; tx += 1) {
      addTile(set, tx, ty);
    }
  }
}

function makeAssetFootprint(tileX, tileY, assetWidth, assetHeight, anchorY) {
  const tile = tileSize;
  const cx = tileX * tile + tile * 0.5;
  const bottom = tileY * tile + tile * 0.9;
  return {
    left: Math.floor((cx - assetWidth * 0.45) / tile),
    right: Math.floor((cx + assetWidth * 0.45) / tile),
    top: Math.floor((bottom - assetHeight * anchorY) / tile),
    bottom: Math.floor(bottom / tile),
  };
}

function addAssetFootprint(set, tileX, tileY, assetWidth, assetHeight, anchorY) {
  const footprint = makeAssetFootprint(tileX, tileY, assetWidth, assetHeight, anchorY);
  for (let y = footprint.top; y <= footprint.bottom; y += 1) {
    for (let x = footprint.left; x <= footprint.right; x += 1) {
      addTile(set, x, y);
    }
  }
}

function isAssetFootprintClear(blocked, tileX, tileY, assetWidth, assetHeight, anchorY) {
  const footprint = makeAssetFootprint(tileX, tileY, assetWidth, assetHeight, anchorY);
  for (let y = footprint.top; y <= footprint.bottom; y += 1) {
    for (let x = footprint.left; x <= footprint.right; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      if (blocked.has(key(x, y))) return false;
      if (key(x, y) === key(sx(0), 7) || key(x, y) === key(sx(9), 12)) return false;
    }
  }
  return true;
}

function makePathTiles() {
  const set = new Set();
  for (let i = 1; i < pathWaypoints.length; i += 1) {
    const a = pathWaypoints[i - 1];
    const b = pathWaypoints[i];
    if (a.x === b.x) {
      const min = Math.min(a.y, b.y);
      const max = Math.max(a.y, b.y);
      for (let y = min; y <= max; y += 1) addTile(set, a.x, y);
    } else if (a.y === b.y) {
      const min = Math.min(a.x, b.x);
      const max = Math.max(a.x, b.x);
      for (let x = min; x <= max; x += 1) addTile(set, x, a.y);
    }
  }
  return set;
}

const decorationCandidates = Object.freeze([
  Object.freeze({ name: "ruins", layer: "back", tileX: 2.2, tileY: 3.6, width: 96, height: 66, anchorY: 0.86, alpha: 0.9, seed: 11 }),
  Object.freeze({ name: "rocks", layer: "back", tileX: 15.4, tileY: 8.8, width: 84, height: 52, anchorY: 0.86, alpha: 0.9, seed: 12 }),
  Object.freeze({ name: "rocks", layer: "back", tileX: 3.2, tileY: 18.2, width: 78, height: 48, anchorY: 0.86, alpha: 0.9, seed: 13 }),
  Object.freeze({ name: "ruins", layer: "back", tileX: 14.7, tileY: 20.2, width: 96, height: 66, anchorY: 0.86, alpha: 0.9, seed: 14 }),
  Object.freeze({ name: "tree", layer: "front", tileX: 2.1, tileY: 10.0, width: 66, height: 92, anchorY: 0.86, alpha: 0.9, seed: 17 }),
  Object.freeze({ name: "pine", layer: "front", tileX: 4.2, tileY: 15.0, width: 62, height: 90, anchorY: 0.86, alpha: 0.9, seed: 18 }),
  Object.freeze({ name: "tree", layer: "front", tileX: 15.7, tileY: 14.4, width: 66, height: 92, anchorY: 0.86, alpha: 0.9, seed: 19 }),
  Object.freeze({ name: "pine", layer: "front", tileX: 7.8, tileY: 22.1, width: 60, height: 88, anchorY: 0.86, alpha: 0.9, seed: 20 }),
  Object.freeze({ name: "rocks", layer: "front", tileX: 11.4, tileY: 2.1, width: 76, height: 48, anchorY: 0.86, alpha: 0.9, seed: 21 }),
]);

const landmarkDecorations = Object.freeze([
  Object.freeze({ name: "water", layer: "landmark", tileX: 2.8, tileY: 13.0, width: 150, height: 80, anchorY: 0.78, alpha: 1, seed: 0 }),
  Object.freeze({ name: "angel", layer: "landmark", tileX: 15.2, tileY: 4.5, width: 118, height: 104, anchorY: 0.88, alpha: 1, seed: 0 }),
]);

function makeDecorations(pathBlocked) {
  const decorations = [...landmarkDecorations];
  for (const decoration of decorationCandidates) {
    if (
      isAssetFootprintClear(
        pathBlocked,
        decoration.tileX,
        decoration.tileY,
        decoration.width,
        decoration.height,
        decoration.anchorY,
      )
    ) {
      decorations.push(decoration);
    }
  }
  return decorations;
}

function makeBlockedTiles(pathBlocked, decorations) {
  const set = new Set(pathBlocked);
  addAssetFootprint(set, sx(0) - 0.5, 7.34, 140, 134, 0.9);
  addAssetFootprint(set, sx(9) + 0.12, 11.59, 170, 199, 0.9);
  for (const decoration of decorations) {
    addAssetFootprint(
      set,
      decoration.tileX,
      decoration.tileY,
      decoration.width,
      decoration.height,
      decoration.anchorY,
    );
  }
  return set;
}

function makeBuildableTiles(blocked) {
  const set = new Set();
  addRect(set, 0, 0, width, height);
  for (const blockedKey of blocked) set.delete(blockedKey);
  return set;
}

function makePlacementTiles(buildable, blocked, footprint) {
  const set = new Set();
  for (let y = 0; y <= height - footprint.height; y += 1) {
    for (let x = 0; x <= width - footprint.width; x += 1) {
      let valid = true;
      for (let fy = 0; fy < footprint.height && valid; fy += 1) {
        for (let fx = 0; fx < footprint.width; fx += 1) {
          const tileKey = key(x + fx, y + fy);
          if (!buildable.has(tileKey) || blocked.has(tileKey)) {
            valid = false;
            break;
          }
        }
      }
      if (valid) set.add(key(x, y));
    }
  }
  return set;
}

const pathBlockedSet = makePathTiles();
const decorations = makeDecorations(pathBlockedSet);
const blockedSet = makeBlockedTiles(pathBlockedSet, decorations);
const buildableSet = makeBuildableTiles(blockedSet);
const placementSet = makePlacementTiles(buildableSet, blockedSet, towerFootprint);

function toTiles(set) {
  return Array.from(set, (value) => {
    const [x, y] = value.split(",").map(Number);
    return { x, y };
  });
}

export const MAP_CONFIG = Object.freeze({
  tileSize,
  width,
  height,
  pathWaypoints,
  spawnPosition: { x: sx(0), y: 7 },
  basePosition: { x: sx(9), y: 12 },
  towerFootprint,
  decorations,
  buildableTiles: toTiles(buildableSet),
  placementTiles: toTiles(placementSet),
  blockedTiles: toTiles(blockedSet),
});
