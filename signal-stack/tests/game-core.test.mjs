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
