export const PEBBLE_TIERS = Object.freeze([
  { name: "Hush", radius: 17, frequency: 261.63, color: "#f08b72" },
  { name: "Hum", radius: 22, frequency: 293.66, color: "#e8b75e" },
  { name: "Chime", radius: 28, frequency: 329.63, color: "#b9ca71" },
  { name: "Bell", radius: 35, frequency: 392, color: "#6fc1aa" },
  { name: "Chord", radius: 43, frequency: 440, color: "#69a9c6" },
  { name: "Chorus", radius: 52, frequency: 523.25, color: "#8e83c6" },
  { name: "Anthem", radius: 63, frequency: 659.25, color: "#c779a8" },
  { name: "Choir", radius: 76, frequency: 783.99, color: "#f2d985" },
]);

export const CHOIR_PHYSICS = Object.freeze({
  enableSleeping: false,
});

export function isPebbleSupported({
  pebble,
  pebbles,
  worldHeight,
  tolerance = 2,
}) {
  const radius = PEBBLE_TIERS[pebble.tier]?.radius ?? PEBBLE_TIERS[0].radius;
  if (pebble.y + radius >= worldHeight - tolerance) return true;

  return pebbles.some((other) => {
    if (other.id === pebble.id || other.y <= pebble.y) return false;
    const otherRadius =
      PEBBLE_TIERS[other.tier]?.radius ?? PEBBLE_TIERS[0].radius;
    return Math.hypot(other.x - pebble.x, other.y - pebble.y) <=
      radius + otherRadius + tolerance;
  });
}

export function spawnTier(random = Math.random) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  if (value < 0.58) return 0;
  if (value < 0.88) return 1;
  return 2;
}

export function clampDropX(x, tier, worldWidth) {
  const radius = PEBBLE_TIERS[tier]?.radius ?? PEBBLE_TIERS[0].radius;
  return Math.min(worldWidth - radius - 8, Math.max(radius + 8, x));
}

export function canMerge(first, second) {
  return Boolean(
    first &&
      second &&
      first.id !== second.id &&
      first.tier === second.tier &&
      first.tier >= 0 &&
      first.tier < PEBBLE_TIERS.length - 1,
  );
}

export function mergePoints(sourceTier, chain = 0) {
  const base = (sourceTier + 1) * (sourceTier + 2) * 10;
  return base * Math.max(1, chain + 1);
}

export function mergeOutcome(first, second, chain = 0) {
  if (!canMerge(first, second)) return null;
  const tier = first.tier + 1;
  return {
    tier,
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    velocity: {
      x: ((first.velocity?.x || 0) + (second.velocity?.x || 0)) / 2,
      y: Math.min(
        -0.6,
        ((first.velocity?.y || 0) + (second.velocity?.y || 0)) / 2 - 0.8,
      ),
    },
    points: mergePoints(first.tier, chain),
  };
}

export function collisionPairKey(firstId, secondId) {
  return [String(firstId), String(secondId)].sort().join(":");
}

export function selectMergePairs(collisions) {
  const used = new Set();
  const seenPairs = new Set();
  const selected = [];

  for (const collision of collisions) {
    const { first, second } = collision;
    const key = collisionPairKey(first.id, second.id);
    if (
      seenPairs.has(key) ||
      used.has(first.id) ||
      used.has(second.id) ||
      !canMerge(first, second)
    ) {
      continue;
    }
    seenPairs.add(key);
    used.add(first.id);
    used.add(second.id);
    selected.push(collision);
  }
  return selected;
}

export function updateOverflowState({
  pebbles,
  topLine,
  now,
  previousSince = null,
  graceMs = 1200,
  spawnGraceMs = 900,
}) {
  const overflowing = pebbles.some(
    (pebble) =>
      now - pebble.createdAt >= spawnGraceMs &&
      pebble.y - PEBBLE_TIERS[pebble.tier].radius < topLine,
  );
  if (!overflowing) {
    return { since: null, ended: false };
  }
  const since = previousSince ?? now;
  return { since, ended: now - since >= graceMs };
}

export function safeChoirProgress(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    best:
      Number.isFinite(source.best) && source.best > 0
        ? Math.floor(source.best)
        : 0,
    runs:
      Number.isFinite(source.runs) && source.runs > 0
        ? Math.floor(source.runs)
        : 0,
    largestTier:
      Number.isInteger(source.largestTier) &&
      source.largestTier >= 0 &&
      source.largestTier < PEBBLE_TIERS.length
        ? source.largestTier
        : 0,
  };
}

export function choirAchievement(score, largestTier) {
  if (largestTier >= 7) return "Full Choir";
  if (score >= 5000) return "Resonance Keeper";
  if (score >= 2000) return "Harmony Finder";
  if (score >= 700) return "Bell Maker";
  return "First Note";
}

export function choirBoardMetrics(viewportWidth) {
  const width = Math.min(420, Math.max(300, viewportWidth - 20));
  return {
    width,
    height: Math.round(width * 1.28),
    scale: width / 360,
  };
}
