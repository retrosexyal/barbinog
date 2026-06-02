export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function rectContains(rect, x, y) {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

export function normalizeSafe(x, y) {
  const lenSq = x * x + y * y;
  if (lenSq <= 0.000001) return { x: 0, y: 0, len: 0 };
  const len = Math.sqrt(lenSq);
  return { x: x / len, y: y / len, len };
}

export function formatCompact(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 10000) return `${Math.floor(value / 1000)}k`;
  return `${Math.floor(value)}`;
}
