const tileSize = 48;
const contentOffsetX = 1;
const width = 18;
const height = 24;

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

function makeBuildableTiles(blocked) {
  const set = new Set();
  addRect(set, sx(6), 3, 4, 4);
  addRect(set, sx(4), 6, 1, 1);
  addRect(set, sx(4), 8, 1, 1);
  addRect(set, sx(6), 8, 1, 1);
  addRect(set, sx(12), 15, 1, 1);
  addRect(set, sx(7), 20, 1, 1);
  addRect(set, sx(9), 17, 4, 4);

  for (const blockedKey of blocked) {
    set.delete(blockedKey);
  }
  return set;
}

const blockedSet = makePathTiles();
const buildableSet = makeBuildableTiles(blockedSet);

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
  buildableTiles: toTiles(buildableSet),
  blockedTiles: toTiles(blockedSet),
});
