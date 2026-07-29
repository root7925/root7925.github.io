import test from "node:test";
import assert from "node:assert/strict";

import {
  PEBBLE_TIERS,
  canMerge,
  choirAchievement,
  choirBoardMetrics,
  clampDropX,
  mergeOutcome,
  mergePoints,
  safeChoirProgress,
  selectMergePairs,
  spawnTier,
  updateOverflowState,
} from "../game-core.js";

const pebble = (id, tier, x = 100, y = 100) => ({
  id,
  tier,
  x,
  y,
  velocity: { x: 0, y: 0 },
});

test("spawn distribution exposes only the three smallest pebbles", () => {
  assert.equal(spawnTier(() => 0), 0);
  assert.equal(spawnTier(() => 0.579), 0);
  assert.equal(spawnTier(() => 0.58), 1);
  assert.equal(spawnTier(() => 0.879), 1);
  assert.equal(spawnTier(() => 0.999), 2);
});

test("drop positions keep the whole pebble inside the vessel", () => {
  assert.equal(clampDropX(-20, 0, 360), 25);
  assert.equal(clampDropX(400, 2, 360), 324);
  assert.equal(clampDropX(180, 1, 360), 180);
});

test("only equal non-final tiers can merge", () => {
  assert.equal(canMerge(pebble("a", 1), pebble("b", 1)), true);
  assert.equal(canMerge(pebble("a", 1), pebble("b", 2)), false);
  assert.equal(
    canMerge(
      pebble("a", PEBBLE_TIERS.length - 1),
      pebble("b", PEBBLE_TIERS.length - 1),
    ),
    false,
  );
});

test("merge outcome averages position and grows score by tier and chain", () => {
  const outcome = mergeOutcome(
    pebble("a", 2, 60, 120),
    pebble("b", 2, 100, 100),
    1,
  );
  assert.equal(outcome.tier, 3);
  assert.deepEqual([outcome.x, outcome.y], [80, 110]);
  assert.equal(outcome.points, mergePoints(2, 1));
  assert.ok(outcome.velocity.y < 0);
});

test("duplicate and shared-body collisions produce one deterministic merge", () => {
  const a = pebble("a", 0);
  const b = pebble("b", 0);
  const c = pebble("c", 0);
  assert.deepEqual(
    selectMergePairs([
      { first: a, second: b },
      { first: b, second: a },
      { first: a, second: c },
    ]).map(({ first, second }) => [first.id, second.id]),
    [["a", "b"]],
  );
});

test("overflow requires both spawn grace and sustained pressure", () => {
  const high = { ...pebble("a", 0, 50, 70), createdAt: 0 };
  assert.deepEqual(
    updateOverflowState({
      pebbles: [high],
      topLine: 90,
      now: 1000,
    }),
    { since: 1000, ended: false },
  );
  assert.deepEqual(
    updateOverflowState({
      pebbles: [high],
      topLine: 90,
      now: 2300,
      previousSince: 1000,
    }),
    { since: 1000, ended: true },
  );
  assert.deepEqual(
    updateOverflowState({
      pebbles: [{ ...high, createdAt: 2000 }],
      topLine: 90,
      now: 2300,
      previousSince: 1000,
    }),
    { since: null, ended: false },
  );
});

test("progress parser rejects arbitrary and out-of-range fields", () => {
  assert.deepEqual(
    safeChoirProgress({
      best: 901.8,
      runs: 3,
      largestTier: 99,
      seed: "private",
    }),
    { best: 901, runs: 3, largestTier: 0 },
  );
});

test("earned identity never claims an unverified rank", () => {
  assert.equal(choirAchievement(10, 0), "First Note");
  assert.equal(choirAchievement(700, 2), "Bell Maker");
  assert.equal(choirAchievement(6000, 6), "Resonance Keeper");
  assert.equal(choirAchievement(10, 7), "Full Choir");
});

test("mobile vessel remains one-thumb sized without horizontal overflow", () => {
  const mobile = choirBoardMetrics(390);
  assert.ok(mobile.width <= 370);
  assert.ok(mobile.height <= 474);
  const narrow = choirBoardMetrics(320);
  assert.equal(narrow.width, 300);
});
