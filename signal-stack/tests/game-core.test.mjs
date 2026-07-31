import assert from "node:assert/strict";
import test from "node:test";

import {
  achievementForScore,
  advanceTurn,
  boardMetrics,
  canPlaceCells,
  createGrid,
  createSignalTargets,
  hasAnyMove,
  placementOriginForTap,
  resolveGridPieceTap,
  rotateCellsClockwise,
  safeProgress,
} from "../game-core.js";
import { drawPiece, publicDeckContract } from "../piece-deck.js";

test("four rotations return every toned cell to its original position", () => {
  const initial = [
    { x: 0, y: 0, tone: "light" },
    { x: 0, y: 1, tone: "dark" },
    { x: 1, y: 1, tone: "light" },
  ];
  let current = initial;
  for (let turn = 0; turn < 4; turn += 1) {
    current = rotateCellsClockwise(current);
  }
  assert.deepEqual(current, initial);
});

test("placement rejects overflow and occupied cells", () => {
  const grid = createGrid(3, 3);
  grid[1][1] = "light";
  const domino = [
    { x: 0, y: 0, tone: "light" },
    { x: 1, y: 0, tone: "dark" },
  ];
  assert.equal(canPlaceCells(grid, domino, { x: 2, y: 0 }), false);
  assert.equal(canPlaceCells(grid, domino, { x: 0, y: 1 }), false);
  assert.equal(canPlaceCells(grid, domino, { x: 0, y: 0 }), true);
});

test("a tap near an edge centers and clamps the whole piece onto the board", () => {
  const grid = createGrid(4, 4);
  const ell = [
    { x: 0, y: 0, tone: "light" },
    { x: 0, y: 1, tone: "dark" },
    { x: 1, y: 1, tone: "light" },
  ];
  assert.deepEqual(placementOriginForTap(grid, ell, { x: 3, y: 3 }), {
    x: 2,
    y: 2,
  });
  assert.deepEqual(placementOriginForTap(grid, ell, { x: 0, y: 0 }), {
    x: 0,
    y: 0,
  });
});

test("a blocked center may use another valid alignment that still covers the tap", () => {
  const grid = createGrid(3, 4);
  grid[0][1] = "dark";
  const domino = [
    { x: 0, y: 0, tone: "light" },
    { x: 1, y: 0, tone: "dark" },
  ];
  assert.deepEqual(
    placementOriginForTap(grid, domino, { x: 2, y: 0 }),
    { x: 2, y: 0 },
  );
});

test("a simultaneous row and column clear is evaluated before removal", () => {
  const grid = [
    ["light", "dark", null],
    ["dark", "light", "light"],
    ["light", "dark", "dark"],
  ];
  const piece = {
    id: "last-cell",
    cells: [{ x: 0, y: 0, tone: "light" }],
  };
  const result = advanceTurn({
    grid,
    piece,
    origin: { x: 2, y: 0 },
    rowTargets: [2, 2, 1],
    columnTargets: [2, 1, 2],
    combo: 0,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.completed.rows, [0, 1, 2]);
  assert.deepEqual(result.completed.columns, [0, 1, 2]);
  assert.equal(result.cleanLineCount, 6);
  assert.ok(result.grid.every((row) => row.every((cell) => cell === null)));
});

test("clean signal scoring rewards exact counts and consecutive clears", () => {
  const grid = [["light", "dark", null]];
  const result = advanceTurn({
    grid,
    piece: { id: "finish", cells: [{ x: 0, y: 0, tone: "light" }] },
    origin: { x: 2, y: 0 },
    rowTargets: [2],
    columnTargets: [1, 0, 1],
    combo: 1,
  });
  assert.equal(result.cleanLineCount, 4);
  assert.equal(result.nextCombo, 2);
  assert.equal(result.points, 2455);
});

test("repeated tapping rotates while the first tap only selects", () => {
  assert.equal(resolveGridPieceTap(null, "p1"), "select");
  assert.equal(resolveGridPieceTap("p1", "p1"), "rotate");
  assert.equal(resolveGridPieceTap("p1", "p2"), "select");
});

test("available move detection checks rotated orientations", () => {
  const grid = [
    [null, "dark"],
    [null, "light"],
  ];
  const horizontalDomino = {
    id: "p1",
    cells: [
      { x: 0, y: 0, tone: "light" },
      { x: 1, y: 0, tone: "dark" },
    ],
  };
  assert.equal(hasAnyMove(grid, [horizontalDomino]), true);
});

test("a blocked board reports game over instead of leaving a dead tray", () => {
  const grid = [
    ["light", "dark"],
    ["dark", "light"],
  ];
  const domino = {
    id: "p1",
    cells: [
      { x: 0, y: 0, tone: "light" },
      { x: 1, y: 0, tone: "dark" },
    ],
  };
  assert.equal(hasAnyMove(grid, [domino]), false);
});

test("a completed line always clears even when its signal clue is missed", () => {
  const result = advanceTurn({
    grid: [["dark", "dark", null]],
    piece: { id: "finish", cells: [{ x: 0, y: 0, tone: "dark" }] },
    origin: { x: 2, y: 0 },
    rowTargets: [2],
    columnTargets: [1, 1, 1],
    combo: 3,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.completed.rows, [0]);
  assert.equal(result.cleanLineCount, 0);
  assert.equal(result.nextCombo, 4);
  assert.ok(result.grid[0].every((cell) => cell === null));
});

test("signal targets stay centered rather than demanding extreme color luck", () => {
  const targets = createSignalTargets(8, 7, () => 0.999);
  assert.ok(targets.rows.every((value) => value >= 2 && value <= 5));
  assert.ok(targets.columns.every((value) => value >= 3 && value <= 5));
});

test("public deck pieces are small, toned, and contain no private fields", () => {
  const draws = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
  let index = 0;
  const piece = drawPiece(
    () => draws[index++ % draws.length],
    "public-piece",
  );
  const contract = publicDeckContract();

  assert.equal(contract.maximumCells, 4);
  assert.ok(piece.cells.length >= 2 && piece.cells.length <= 4);
  assert.ok(piece.cells.every((cell) => contract.tones.includes(cell.tone)));
  for (const forbidden of ["seed", "solution", "answer", "diagnostics"]) {
    assert.equal(forbidden in piece, false);
  }
});

test("mobile board stays tappable and within a single-screen interaction budget", () => {
  const metrics = boardMetrics({ viewportWidth: 390 });
  assert.ok(metrics.cell >= 42);
  assert.ok(metrics.boardWidth <= 322);
  assert.ok(metrics.interactiveHeight <= 844);
});

test("progress parsing cannot restore arbitrary private payloads", () => {
  assert.deepEqual(
    safeProgress({
      best: 1234.9,
      runs: 2,
      cleanSignals: 4,
      seed: "must-not-survive",
      identity: "must-not-survive",
    }),
    { best: 1234, runs: 2, cleanSignals: 4 },
  );
  assert.equal(achievementForScore(5200), "Signal Keeper");
});

test("every deck shape fits onto a standard board in some orientation", () => {
  // 可玩性不变式：标准 8×7 board 上，每个 shape 至少有一种旋转能放置。
  // 用固定 random 序列遍历 deck 抽取所有 shape，验证每个都能放进空 board。
  const contract = publicDeckContract();
  const seen = new Map(); // shape name -> 能放置
  const draws = Array.from({ length: 200 }, (_, i) => i / 200);
  let idx = 0;
  for (const r of draws) {
    const piece = drawPiece(() => r, `probe-${idx++}`);
    const grid = createGrid(8, 7);
    const orientations = [piece.cells];
    let rotated = piece.cells;
    for (let turn = 0; turn < 3; turn += 1) {
      rotated = rotateCellsClockwise(rotated);
      orientations.push(rotated);
    }
    const fits = orientations.some((cells) =>
      cells.every((c) => c.x >= 0 && c.y >= 0 && c.x < 7 && c.y < 8),
    );
    seen.set(piece.name, fits || seen.get(piece.name) || false);
  }
  // 每个 shape 至少出现一次且能放置
  for (const [name, fits] of seen) {
    assert.equal(fits, true, `shape ${name} cannot fit on standard board`);
  }
  // 覆盖所有 shape（contract.shapeCount 个）
  assert.ok(seen.size === contract.shapeCount, `expected ${contract.shapeCount} shapes, saw ${seen.size}`);
});

test("drawn pieces never leak private fields and stay within cell budget", () => {
  const contract = publicDeckContract();
  const tones = new Set(contract.tones);
  for (let i = 0; i < 100; i += 1) {
    const piece = drawPiece(() => i / 100, `budget-${i}`);
    assert.ok(piece.cells.length >= 2 && piece.cells.length <= contract.maximumCells);
    assert.ok(piece.cells.every((c) => tones.has(c.tone)));
    for (const forbidden of ["seed", "solution", "answer", "diagnostics"]) {
      assert.equal(forbidden in piece, false);
    }
  }
});

test("rotating any drawn piece preserves its tone multiset", () => {
  // 旋转不变式：旋转只改变坐标，不改变 tone 组成。
  for (let i = 0; i < 50; i += 1) {
    const piece = drawPiece(() => i / 50, `rot-${i}`);
    const originalTones = piece.cells.map((c) => c.tone).sort();
    let cells = piece.cells;
    for (let turn = 0; turn < 4; turn += 1) {
      cells = rotateCellsClockwise(cells);
    }
    const rotatedTones = cells.map((c) => c.tone).sort();
    assert.deepEqual(rotatedTones, originalTones);
  }
});
