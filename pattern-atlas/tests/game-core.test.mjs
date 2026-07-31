import assert from "node:assert/strict";
import test from "node:test";

import {
  boardMatchesTarget,
  computeLayoutMetrics,
  dimensions,
  nextAllowedRotation,
  placementAllowed,
  placementOriginForTap,
  resolveBoardTap,
  resolveTapAction,
  rotateClockwise,
  stablePieceDimensions,
} from "../game-core.js";
import { COLLECTION } from "../collection-01.js";

test("a full board only wins when every color matches the target", () => {
  const targetColors = new Map([
    ["0,0", "red"], ["1,0", "blue"],
    ["0,1", "blue"], ["1,1", "red"],
  ]);
  const correct = [
    { x: 0, y: 0, color: "red" }, { x: 1, y: 0, color: "blue" },
    { x: 0, y: 1, color: "blue" }, { x: 1, y: 1, color: "red" },
  ];
  const wrong = [...correct.slice(0, 3), { x: 1, y: 1, color: "blue" }];

  assert.equal(boardMatchesTarget({ size: 2, targetColors, placedCells: correct }), true);
  assert.equal(boardMatchesTarget({ size: 2, targetColors, placedCells: wrong }), false);
});

test("a full target rejects a piece that only fits geometrically", () => {
  const cells = [{ x: 0, y: 0, color: "blue" }];
  assert.equal(placementAllowed({
    cells,
    origin: { x: 0, y: 0 },
    size: 2,
    occupied: new Set(),
    clueColors: new Map([["0,0", "red"]]),
  }), false);
});

test("four clockwise rotations restore a piece exactly", () => {
  const initial = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  let cells = initial;
  for (let turn = 0; turn < 4; turn += 1) cells = rotateClockwise(cells);
  assert.deepEqual(cells, initial);
});

test("restricted rotations cycle only through authored turns", () => {
  assert.equal(nextAllowedRotation(0, [0]), 0);
  assert.equal(nextAllowedRotation(0, [0, 2]), 2);
  assert.equal(nextAllowedRotation(2, [0, 2]), 0);
  assert.equal(nextAllowedRotation(3, [0, 1, 2, 3]), 0);
});

test("selecting and tapping the same fragment again advances its rotation", () => {
  const piece = COLLECTION.levels[0].pieces[0];
  const firstTap = resolveTapAction({
    wasSelected: false,
    selectedId: null,
    pieceId: piece.id,
  });
  const secondTap = resolveTapAction({
    wasSelected: true,
    selectedId: piece.id,
    pieceId: piece.id,
  });
  const nextRotation = nextAllowedRotation(
    piece.rotation,
    piece.allowedRotations,
  );

  assert.equal(firstTap, "select");
  assert.equal(secondTap, "rotate");
  assert.notEqual(nextRotation, piece.rotation);
});

test("a valid board tap commits immediately after repeated-tap rotation", () => {
  const source = COLLECTION.levels[0].pieces[2];
  let rotation = source.rotation;

  for (let tap = 0; tap < 3; tap += 1) {
    rotation = nextAllowedRotation(rotation, source.allowedRotations);
  }
  let cells = source.cells.map(([x, y, color]) => ({ x, y, color }));
  for (let turn = 0; turn < rotation; turn += 1) {
    cells = rotateClockwise(cells);
  }

  const targetColors = new Map(
    COLLECTION.levels[0].target.flatMap((row, y) =>
      row.map((color, x) => [`${x},${y}`, color]),
    ),
  );
  const allowed = placementAllowed({
    cells,
    origin: { x: 0, y: 0 },
    size: COLLECTION.levels[0].size,
    occupied: new Set(),
    clueColors: targetColors,
  });

  assert.equal(rotation, 0);
  assert.equal(allowed, true);
  assert.equal(
    resolveBoardTap({
      hasSelection: true,
      placementIsValid: allowed,
    }),
    "place",
  );
});

test("invalid board taps reject without losing the selected fragment", () => {
  assert.equal(
    resolveBoardTap({ hasSelection: true, placementIsValid: false }),
    "reject",
  );
  assert.equal(
    resolveBoardTap({ hasSelection: false, placementIsValid: true }),
    "ignore",
  );
});

test("edge taps fit the whole selected fragment inside the board", () => {
  const cells = [
    { x: 0, y: 0, color: "teal" },
    { x: 0, y: 1, color: "blue" },
  ];
  const origin = placementOriginForTap({
    cells,
    tap: { x: 0, y: 2 },
    size: 3,
    isAllowed: (candidate) => candidate.x === 0 && candidate.y === 1,
  });

  assert.deepEqual(origin, { x: 0, y: 1 });
  assert.ok(cells.every((cell) =>
    cell.x + origin.x >= 0 &&
    cell.y + origin.y >= 0 &&
    cell.x + origin.x < 3 &&
    cell.y + origin.y < 3
  ));
});

test("the first collection contains twenty structurally complete studies", () => {
  assert.equal(COLLECTION.levels.length, 20);
  assert.equal(new Set(COLLECTION.levels.map((level) => level.id)).size, 20);

  for (const level of COLLECTION.levels) {
    assert.equal(level.target.length, level.size);
    assert.ok(level.target.every((row) => row.length === level.size));
    assert.equal(
      level.pieces.reduce((total, piece) => total + piece.cells.length, 0),
      level.size * level.size,
    );
    assert.ok(
      level.pieces.every((piece) =>
        piece.allowedRotations.includes(piece.rotation),
      ),
    );
    assert.ok(
      level.pieces.every((piece) =>
        piece.allowedRotations.length > 1,
      ),
      `${level.id} contains a fragment that cannot rotate`,
    );
    assert.ok(
      level.pieces.some((piece) => piece.rotation !== 0),
      `${level.id} does not require any opening rotation`,
    );
    assert.equal("diagnostics" in level, false);
    assert.equal("authoredSolution" in level, false);
    assert.equal("seed" in level, false);
    if (level.mode === "clues") assert.ok(level.clues.length > 0);
    if (level.mode === "target") assert.equal("clues" in level, false);
  }
});

test("every collection study keeps its board and tray inside the mobile budget", () => {
  for (const level of COLLECTION.levels) {
    const stableSizes = level.pieces.map((piece) =>
      stablePieceDimensions({
        cells: piece.cells.map(([x, y, color]) => ({ x, y, color })),
      }),
    );
    const layout = computeLayoutMetrics({
      stageWidth: 362,
      viewportHeight: 844,
      levelSize: level.size,
      stableSizes,
      clueMode: level.mode === "clues",
    });

    assert.ok(layout.cell >= 42, `${level.id} cells became too small`);
    assert.ok(layout.trayCell >= 12, `${level.id} fragments became too small`);
    assert.ok(layout.height <= 756, `${level.id} overflowed vertically`);
  }
});

test("every collection study is solvable: pieces at rotation=0 cover the target", () => {
  // piece.cells 本身就是 rotation=0（原始设计）状态，rotation 字段只是初始展示提示。
  // 用回溯搜索验证：所有 piece 在 rotation=0 下存在一种放置方案，能无重叠覆盖整个 board 且每格颜色匹配 target。
  // 贪心按顺序放置无法处理 target 有重复模式、多个 piece 同形状的情况，必须搜索组合。
  const tryPlace = (pieces, idx, size, target, covered) => {
    if (idx === pieces.length) return covered.size === size * size;
    const cells = pieces[idx].cells;
    const { width, height } = dimensions(cells.map(([x, y]) => ({ x, y })));
    for (let oy = 0; oy <= size - height; oy += 1) {
      for (let ox = 0; ox <= size - width; ox += 1) {
        const candidate = cells.map(([x, y, color]) => ({ x: x + ox, y: y + oy, color }));
        const fits = candidate.every((c) =>
          c.x >= 0 && c.y >= 0 && c.x < size && c.y < size &&
          target[c.y][c.x] === c.color &&
          !covered.has(`${c.x},${c.y}`),
        );
        if (!fits) continue;
        for (const c of candidate) covered.set(`${c.x},${c.y}`, c.color);
        if (tryPlace(pieces, idx + 1, size, target, covered)) return true;
        for (const c of candidate) covered.delete(`${c.x},${c.y}`);
      }
    }
    return false;
  };

  for (const level of COLLECTION.levels) {
    const covered = new Map();
    const solvable = tryPlace(level.pieces, 0, level.size, level.target, covered);
    assert.ok(solvable, `${level.id} is not solvable at rotation=0`);
    assert.equal(covered.size, level.size * level.size, `${level.id} does not cover the whole board`);
  }
});

