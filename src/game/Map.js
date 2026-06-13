export class GameMap {
  constructor(config) {
    this.tileSize = config.tileSize;
    this.width = config.width;
    this.height = config.height;
    this.pathWaypoints = config.pathWaypoints;
    this.spawnPosition = config.spawnPosition;
    this.basePosition = config.basePosition;
    this.towerFootprint = config.towerFootprint || { width: 1, height: 1 };
    this.decorations = config.decorations || [];
    this.pathTiles = config.pathTiles || config.blockedTiles;
    this.buildableTiles = config.buildableTiles;
    this.placementTiles = config.placementTiles || config.buildableTiles;
    this.blockedTiles = config.blockedTiles;
    this.path = new Set(this.pathTiles.map((tile) => this.key(tile.x, tile.y)));
    this.buildable = new Set(config.buildableTiles.map((tile) => this.key(tile.x, tile.y)));
    this.placement = new Set(this.placementTiles.map((tile) => this.key(tile.x, tile.y)));
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
    return this.path.has(this.key(x, y));
  }

  isBuildableTile(x, y) {
    const key = this.key(x, y);
    return this.isInBounds(x, y) && this.buildable.has(key) && !this.blocked.has(key);
  }

  canBuildAt(x, y, footprint = this.towerFootprint) {
    const width = Math.max(1, footprint?.width || 1);
    const height = Math.max(1, footprint?.height || 1);
    for (let fy = 0; fy < height; fy += 1) {
      for (let fx = 0; fx < width; fx += 1) {
        const tx = x + fx;
        const ty = y + fy;
        const key = this.key(tx, ty);
        if (!this.isBuildableTile(tx, ty) || this.occupied.has(key)) return false;
      }
    }
    return true;
  }

  occupy(x, y, footprint = this.towerFootprint) {
    const width = Math.max(1, footprint?.width || 1);
    const height = Math.max(1, footprint?.height || 1);
    for (let fy = 0; fy < height; fy += 1) {
      for (let fx = 0; fx < width; fx += 1) {
        this.occupied.add(this.key(x + fx, y + fy));
      }
    }
  }

  unoccupy(x, y, footprint = this.towerFootprint) {
    const width = Math.max(1, footprint?.width || 1);
    const height = Math.max(1, footprint?.height || 1);
    for (let fy = 0; fy < height; fy += 1) {
      for (let fx = 0; fx < width; fx += 1) {
        this.occupied.delete(this.key(x + fx, y + fy));
      }
    }
  }

  tileCenter(x, y, out = { x: 0, y: 0 }) {
    out.x = x * this.tileSize + this.tileSize * 0.5;
    out.y = y * this.tileSize + this.tileSize * 0.5;
    return out;
  }

  footprintCenter(x, y, footprint = this.towerFootprint, out = { x: 0, y: 0 }) {
    const width = Math.max(1, footprint?.width || 1);
    const height = Math.max(1, footprint?.height || 1);
    out.x = (x + width * 0.5) * this.tileSize;
    out.y = (y + height * 0.5) * this.tileSize;
    return out;
  }

  worldToTile(x, y, out = { x: 0, y: 0 }) {
    out.x = Math.floor(x / this.tileSize);
    out.y = Math.floor(y / this.tileSize);
    return out;
  }
}
