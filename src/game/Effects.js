export class Effect {
  constructor() {
    this.active = false;
  }

  init(type, x, y, data = {}) {
    this.active = true;
    this.type = type;
    this.x = x;
    this.y = y;
    this.x2 = data.x2 || x;
    this.y2 = data.y2 || y;
    this.text = data.text || "";
    this.color = data.color || "#ffffff";
    this.radius = data.radius || 24;
    this.duration = data.duration || (type === "text" ? 0.7 : type === "beam" ? 0.12 : 0.35);
    this.life = this.duration;
    this.vy = data.vy || -26;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.type === "text") {
      this.y += this.vy * dt;
    }
    if (this.life <= 0) {
      this.active = false;
    }
  }

  get alpha() {
    return Math.max(0, this.life / this.duration);
  }
}
