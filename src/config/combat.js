export const ATTACK_TYPES = Object.freeze({
  piercing: { label: "Pierce", color: "#fff1c2" },
  magic: { label: "Magic", color: "#c7b8ff" },
  siege: { label: "Siege", color: "#ffd28a" },
  chaos: { label: "Chaos", color: "#ff9c7a" },
});

export const ARMOR_TYPES = Object.freeze({
  unarmored: { label: "Unarmored" },
  light: { label: "Light" },
  heavy: { label: "Heavy" },
  magical: { label: "Magical" },
});

export const ATTACK_ARMOR_MULTIPLIERS = Object.freeze({
  piercing: Object.freeze({
    unarmored: 1.35,
    light: 1.25,
    heavy: 0.75,
    magical: 0.85,
  }),
  magic: Object.freeze({
    unarmored: 1,
    light: 1,
    heavy: 1.35,
    magical: 0.65,
  }),
  siege: Object.freeze({
    unarmored: 1.35,
    light: 0.75,
    heavy: 1.05,
    magical: 0.8,
  }),
  chaos: Object.freeze({
    unarmored: 1,
    light: 1,
    heavy: 1,
    magical: 1,
  }),
});

export function getAttackArmorMultiplier(attackType, armorType) {
  return ATTACK_ARMOR_MULTIPLIERS[attackType]?.[armorType] ?? 1;
}

export function getAttackTypeLabel(attackType) {
  return ATTACK_TYPES[attackType]?.label || attackType;
}

export function getArmorTypeLabel(armorType) {
  return ARMOR_TYPES[armorType]?.label || armorType;
}

export function getAttackTypeColor(attackType) {
  return ATTACK_TYPES[attackType]?.color || "#fff1c2";
}

export function normalizeDamageRange(minDamage, maxDamage) {
  const min = Number.isFinite(minDamage) ? minDamage : 0;
  const max = Number.isFinite(maxDamage) ? maxDamage : min;
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

export function rollDamage(minDamage, maxDamage) {
  const range = normalizeDamageRange(minDamage, maxDamage);
  if (range.min === range.max) return range.min;
  return Math.floor(range.min + Math.random() * (range.max - range.min + 1));
}

export function formatDamageRange(minDamage, maxDamage) {
  const range = normalizeDamageRange(minDamage, maxDamage);
  const min = Math.round(range.min);
  const max = Math.round(range.max);
  return min === max ? `${min}` : `${min}-${max}`;
}
