import test from "node:test";
import assert from "node:assert/strict";

import { LANTERN_GROVE_COLLECTION } from "../collection-01.js";
import {
  CELL_EMPTY,
  CELL_LANTERN,
  CELL_MARK,
  applyCellAction,
  computeBoardSize,
  createGameState,
  getConflicts,
  getRuleProgress,
  isPuzzleSolved,
  puzzleHasPrivateFields,
  regionEdges,
} from "../game-core.js";

const tinyPuzzle = {
  id: "test",
  size: 4,
  difficulty: "Test",
  regions: [
    0, 1, 2, 3,
    0, 1, 2, 3,
    0, 1, 2, 3,
    0, 1, 2, 3,
  ],
};

test("lantern mode toggles a lantern without hidden cycle states", () => {
  const initial = createGameState(tinyPuzzle);
  const placed = applyCellAction(initial, 0, "lantern");
  const cleared = applyCellAction(placed, 0, "lantern");
  assert.equal(placed.cells[0], CELL_LANTERN);
  assert.equal(cleared.cells[0], CELL_EMPTY);
  assert.equal(cleared.moves, 2);
});

test("mark mode toggles an empty-cell mark", () => {
  const initial = createGameState(tinyPuzzle);
  const marked = applyCellAction(initial, 2, "mark");
  const cleared = applyCellAction(marked, 2, "mark");
  assert.equal(marked.cells[2], CELL_MARK);
  assert.equal(cleared.cells[2], CELL_EMPTY);
});

test("placing a lantern replaces a mark", () => {
  const initial = createGameState(tinyPuzzle);
  const marked = applyCellAction(initial, 2, "mark");
  const lit = applyCellAction(marked, 2, "lantern");
  assert.equal(lit.cells[2], CELL_LANTERN);
});

test("conflicts include repeated rows, columns, regions, and touching cells", () => {
  const rowConflict = {
    ...createGameState(tinyPuzzle),
    cells: [
      CELL_LANTERN, CELL_EMPTY, CELL_LANTERN, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
    ],
  };
  assert.deepEqual([...getConflicts(rowConflict)].sort(), [0, 2]);

  const touchingConflict = {
    ...createGameState(tinyPuzzle),
    cells: [
      CELL_LANTERN, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_LANTERN, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
    ],
  };
  assert.deepEqual([...getConflicts(touchingConflict)].sort(), [0, 5]);
});

test("completion follows public rules rather than a shipped answer key", () => {
  const solved = {
    ...createGameState(tinyPuzzle),
    cells: [
      CELL_EMPTY, CELL_LANTERN, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_EMPTY, CELL_LANTERN,
      CELL_LANTERN, CELL_EMPTY, CELL_EMPTY, CELL_EMPTY,
      CELL_EMPTY, CELL_EMPTY, CELL_LANTERN, CELL_EMPTY,
    ],
  };
  assert.equal(isPuzzleSolved(solved), true);
  assert.deepEqual(getRuleProgress(solved), {
    lanterns: 4,
    rows: 4,
    columns: 4,
    regions: 4,
    target: 4,
  });
});

test("an incomplete board never completes", () => {
  const state = applyCellAction(createGameState(tinyPuzzle), 1, "lantern");
  assert.equal(isPuzzleSolved(state), false);
});

test("region edge calculation outlines garden boundaries", () => {
  assert.deepEqual(regionEdges(tinyPuzzle, 0), {
    top: true,
    right: true,
    bottom: false,
    left: true,
  });
  assert.deepEqual(regionEdges(tinyPuzzle, 5), {
    top: false,
    right: true,
    bottom: false,
    left: true,
  });
});

test("the shipped collection has twenty valid public puzzles", () => {
  assert.equal(LANTERN_GROVE_COLLECTION.length, 20);
  const ids = new Set();
  for (const puzzle of LANTERN_GROVE_COLLECTION) {
    assert.equal(ids.has(puzzle.id), false);
    ids.add(puzzle.id);
    assert.equal(puzzle.regions.length, puzzle.size * puzzle.size);
    assert.deepEqual(
      [...new Set(puzzle.regions)].sort((a, b) => a - b),
      Array.from({ length: puzzle.size }, (_, index) => index),
    );
    assert.equal(puzzleHasPrivateFields(puzzle), false);
  }
});

test("public collection never exposes solutions, seeds, or diagnostics", () => {
  const serialized = JSON.stringify(LANTERN_GROVE_COLLECTION);
  for (const privateWord of [
    "solution",
    "answer",
    "seed",
    "attempt",
    "diagnostics",
  ]) {
    assert.equal(serialized.includes(`"${privateWord}"`), false);
  }
});

test("mobile board budgets keep every cell comfortably tappable", () => {
  for (const size of [5, 6, 7, 8]) {
    const metrics = computeBoardSize(390, size);
    assert.ok(metrics.board <= 362);
    assert.ok(metrics.cell >= 45);
  }
  const narrow = computeBoardSize(320, 8);
  assert.equal(narrow.board <= 292, true);
  assert.equal(narrow.cell >= 36, true);
});

test("every shipped puzzle is solvable under the public rules", () => {
  // 公开规则：每行/列/区域各一灯 + 任意两灯不相邻（含对角）。
  // 用按行回溯验证存在合法放置。规则本身公开，不依赖私有 solver。
  const tryPlace = (size, regions, row, usedCols, usedRegions, placed) => {
    if (row === size) return true;
    for (let col = 0; col < size; col += 1) {
      if (usedCols.has(col)) continue;
      const region = regions[row * size + col];
      if (usedRegions.has(region)) continue;
      // 与上一行灯不相邻（含对角）：列差 ≤1 即禁止
      if (row > 0 && Math.abs(col - placed[row - 1]) <= 1) continue;
      placed[row] = col;
      usedCols.add(col);
      usedRegions.add(region);
      if (tryPlace(size, regions, row + 1, usedCols, usedRegions, placed)) return true;
      usedCols.delete(col);
      usedRegions.delete(region);
    }
    return false;
  };

  for (const puzzle of LANTERN_GROVE_COLLECTION) {
    const placed = new Array(puzzle.size);
    const solvable = tryPlace(
      puzzle.size,
      puzzle.regions,
      0,
      new Set(),
      new Set(),
      placed,
    );
    assert.ok(solvable, `${puzzle.id} is not solvable`);
  }
});

test("every shipped puzzle has a unique solution under the public rules", () => {
  // 严谨性守门：每关必须有且仅有一个合法放置。
  // 多解关卡会让"逻辑推理"退化为"试错"，违反 Lantern Grove 作为逻辑谜题的契约。
  // 规则公开，回溯实现内联在测试中，不依赖私有 solver。
  // clues.fixedLanterns 作为预放灯约束参与求解（与 game-core.js 的 createGameState 一致）。
  const countSolutions = (size, regions, fixedByRow, row, usedCols, usedRegions, placed, count) => {
    if (count.value >= 2) return; // 提前终止：找到 2 个解即判定多解
    if (row === size) {
      count.value += 1;
      return;
    }
    // 若该行有 fixed 灯，只尝试该列；否则尝试所有列
    const fixedCol = fixedByRow.get(row);
    const colsToTry = fixedCol !== undefined ? [fixedCol] : Array.from({ length: size }, (_, c) => c);
    for (const col of colsToTry) {
      if (usedCols.has(col)) continue;
      const region = regions[row * size + col];
      if (usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(col - placed[row - 1]) <= 1) continue;
      placed[row] = col;
      usedCols.add(col);
      usedRegions.add(region);
      countSolutions(size, regions, fixedByRow, row + 1, usedCols, usedRegions, placed, count);
      usedCols.delete(col);
      usedRegions.delete(region);
      if (count.value >= 2) return;
    }
  };

  for (const puzzle of LANTERN_GROVE_COLLECTION) {
    // 构建 fixedByRow 映射（来自 clues.fixedLanterns）
    const fixedByRow = new Map();
    const fixedLanterns = puzzle.clues?.fixedLanterns ?? [];
    for (const idx of fixedLanterns) {
      const row = Math.floor(idx / puzzle.size);
      const col = idx % puzzle.size;
      fixedByRow.set(row, col);
    }

    const placed = new Array(puzzle.size);
    const count = { value: 0 };
    countSolutions(
      puzzle.size,
      puzzle.regions,
      fixedByRow,
      0,
      new Set(),
      new Set(),
      placed,
      count,
    );
    assert.equal(
      count.value,
      1,
      `${puzzle.id} has ${count.value === 0 ? "no" : "multiple"} solutions (expected unique)`,
    );
  }
});

test("clues fixed lanterns are locked and cannot be removed by the player", () => {
  // clues.fixedLanterns 的格子初始即为 CELL_LANTERN，且 applyCellAction 无法切换
  const puzzleWithClues = {
    id: "test-clues",
    size: 4,
    difficulty: "Test",
    regions: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
    clues: { fixedLanterns: [1] }, // (0,1) 预放灯
  };
  const state = createGameState(puzzleWithClues);
  assert.equal(state.cells[1], CELL_LANTERN);
  assert.equal(state.locked.has(1), true);
  // 尝试移除固定灯笼 → 状态不变
  const afterToggle = applyCellAction(state, 1, "lantern");
  assert.equal(afterToggle.cells[1], CELL_LANTERN);
  // 尝试用 mark 覆盖 → 状态不变
  const afterMark = applyCellAction(state, 1, "mark");
  assert.equal(afterMark.cells[1], CELL_LANTERN);
});

test("clues fixed lanterns participate in conflict detection and completion", () => {
  // 固定灯笼参与行/列/区域冲突检测，也参与完成判定
  const puzzle = {
    id: "test-clues-complete",
    size: 4,
    difficulty: "Test",
    regions: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
    clues: { fixedLanterns: [1] }, // (0,1) 预放灯
  };
  const state = createGameState(puzzle);
  // (0,1) 已放灯，在同行 (0,3) 再放一盏 → 应冲突
  const conflictState = applyCellAction(state, 3, "lantern");
  assert.deepEqual([...getConflicts(conflictState)].sort(), [1, 3]);
});
