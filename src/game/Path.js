export class Path {
  constructor(map) {
    this.map = map;
    this.points = map.pathWaypoints.map((point) => map.tileCenter(point.x, point.y, { x: 0, y: 0 }));
    this.segments = [];
    this.totalLength = 0;
    this.buildSegments();
  }

  buildSegments() {
    for (let i = 1; i < this.points.length; i += 1) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len <= 0) continue;
      this.segments.push({
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
        dx,
        dy,
        len,
        start: this.totalLength,
        end: this.totalLength + len,
      });
      this.totalLength += len;
    }
  }

  getStart(out = { x: 0, y: 0 }) {
    out.x = this.points[0].x;
    out.y = this.points[0].y;
    return out;
  }

  sample(distance, hintIndex = 0, out = { x: 0, y: 0, segmentIndex: 0 }) {
    if (distance <= 0) {
      const first = this.points[0];
      out.x = first.x;
      out.y = first.y;
      out.segmentIndex = 0;
      return out;
    }

    const lastIndex = this.segments.length - 1;
    let index = hintIndex < 0 ? 0 : hintIndex > lastIndex ? lastIndex : hintIndex;
    while (index < lastIndex && distance > this.segments[index].end) index += 1;
    while (index > 0 && distance < this.segments[index].start) index -= 1;

    const segment = this.segments[index];
    if (!segment) {
      const last = this.points[this.points.length - 1];
      out.x = last.x;
      out.y = last.y;
      out.segmentIndex = lastIndex;
      return out;
    }

    const t = Math.min(1, Math.max(0, (distance - segment.start) / segment.len));
    out.x = segment.ax + segment.dx * t;
    out.y = segment.ay + segment.dy * t;
    out.segmentIndex = index;
    return out;
  }
}
