export class GameMap {
  constructor(config) {
    this.tileSize = config.tileSize;
    this.width = config.width;
    this.height = config.height;
    this.pathWaypoints = config.pathWaypoints;
    this.spawnPosition = config.spawnPosition;
    this.basePosition = config.basePosition;
    this.buildableTiles = config.buildableTiles;
    this.blockedTiles = config.blockedTiles;
    this.buildable = new Set(config.buildableTiles.map((tile) => this.key(tile.x, tile.y)));
    this.blocked = new Set(config.blockedTiles.map((tile) => this.key(tile.x, tile.y)));
    this.occupied = new Set();
  }

  key(x, y) {
    return `${x},${y}`;
  }

  resetOccupancy() {
    this.occupied.clear();
  }

  isInBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isPathTile(x, y) {
    return this.blocked.has(this.key(x, y));
  }

  isBuildableTile(x, y) {
    const key = this.key(x, y);
    return this.isInBounds(x, y) && this.buildable.has(key) && !this.blocked.has(key);
  }

  canBuildAt(x, y) {
    const key = this.key(x, y);
    return this.isBuildableTile(x, y) && !this.occupied.has(key);
  }

  occupy(x, y) {
    this.occupied.add(this.key(x, y));
  }

  unoccupy(x, y) {
    this.occupied.delete(this.key(x, y));
  }

  tileCenter(x, y, out = { x: 0, y: 0 }) {
    out.x = x * this.tileSize + this.tileSize * 0.5;
    out.y = y * this.tileSize + this.tileSize * 0.5;
    return out;
  }

  worldToTile(x, y, out = { x: 0, y: 0 }) {
    out.x = Math.floor(x / this.tileSize);
    out.y = Math.floor(y / this.tileSize);
    return out;
  }
}
