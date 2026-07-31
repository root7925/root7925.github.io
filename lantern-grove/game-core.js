/**
 * @module lantern-grove/game-core
 * @contract
 *  输入: puzzle {size, regions, clues?}, state {puzzle, cells, moves, locked?}, index (number), mode ("mark"|"lantern")
 *  输出: 新 state / 冲突 Set / 进度对象 {lanterns,rows,columns,regions,target} / 布尔判定
 *  不变式: cells 长度 = size*size；CELL_EMPTY=0, CELL_MARK=1, CELL_LANTERN=2；
 *          isPuzzleSolved 要求所有行/列/区域各有一灯且无冲突；
 *          clues.fixedLanterns 指定预放灯笼（初始即为 CELL_LANTERN 且 locked，玩家不可移除）；
 *          puzzleHasPrivateFields 拒绝 solution/answer/seed/diagnostics 字段
 *  边界: index 越界 → 返回原 state；locked 格子 → 返回原 state；applyCellAction 在 mark/lantern 间切换
 *  公私: PUBLIC（可进 root7925.github.io）
 *  依赖: 无
 *  状态: stable
 */
export const CELL_EMPTY = 0;
export const CELL_MARK = 1;
export const CELL_LANTERN = 2;

export function createGameState(puzzle) {
  const cells = Array(puzzle.size * puzzle.size).fill(CELL_EMPTY);
  // 预设 clues 中的固定灯笼（不可移除），用于保证唯一解
  const locked = new Set();
  const fixedLanterns = puzzle.clues?.fixedLanterns ?? [];
  for (const idx of fixedLanterns) {
    if (idx >= 0 && idx < cells.length) {
      cells[idx] = CELL_LANTERN;
      locked.add(idx);
    }
  }
  return { puzzle, cells, moves: 0, locked };
}

export function cellIndex(row, column, size) {
  return row * size + column;
}

export function cellPosition(index, size) {
  return {
    row: Math.floor(index / size),
    column: index % size,
  };
}

export function applyCellAction(state, index, mode) {
  if (index < 0 || index >= state.cells.length) return state;
  // 固定灯笼（clues）不可被玩家移除或覆盖
  if (state.locked?.has(index)) return state;
  const next = [...state.cells];
  if (mode === "mark") {
    next[index] =
      next[index] === CELL_MARK ? CELL_EMPTY : CELL_MARK;
  } else {
    next[index] =
      next[index] === CELL_LANTERN ? CELL_EMPTY : CELL_LANTERN;
  }
  return { ...state, cells: next, moves: state.moves + 1 };
}

export function lanternIndexes(state) {
  return state.cells
    .map((value, index) => (value === CELL_LANTERN ? index : -1))
    .filter((index) => index >= 0);
}

export function getConflicts(state) {
  const conflicts = new Set();
  const lanterns = lanternIndexes(state);
  for (let left = 0; left < lanterns.length; left += 1) {
    const leftIndex = lanterns[left];
    const leftPosition = cellPosition(leftIndex, state.puzzle.size);
    const leftRegion = state.puzzle.regions[leftIndex];
    for (let right = left + 1; right < lanterns.length; right += 1) {
      const rightIndex = lanterns[right];
      const rightPosition = cellPosition(rightIndex, state.puzzle.size);
      const rightRegion = state.puzzle.regions[rightIndex];
      const sameRow = leftPosition.row === rightPosition.row;
      const sameColumn = leftPosition.column === rightPosition.column;
      const sameRegion = leftRegion === rightRegion;
      const touching =
        Math.abs(leftPosition.row - rightPosition.row) <= 1 &&
        Math.abs(leftPosition.column - rightPosition.column) <= 1;
      if (sameRow || sameColumn || sameRegion || touching) {
        conflicts.add(leftIndex);
        conflicts.add(rightIndex);
      }
    }
  }
  return conflicts;
}

export function getRuleProgress(state) {
  const size = state.puzzle.size;
  const rows = new Set();
  const columns = new Set();
  const regions = new Set();
  for (const index of lanternIndexes(state)) {
    const { row, column } = cellPosition(index, size);
    rows.add(row);
    columns.add(column);
    regions.add(state.puzzle.regions[index]);
  }
  return {
    lanterns: lanternIndexes(state).length,
    rows: rows.size,
    columns: columns.size,
    regions: regions.size,
    target: size,
  };
}

export function isPuzzleSolved(state) {
  const progress = getRuleProgress(state);
  return (
    progress.lanterns === progress.target &&
    progress.rows === progress.target &&
    progress.columns === progress.target &&
    progress.regions === progress.target &&
    getConflicts(state).size === 0
  );
}

export function regionEdges(puzzle, index) {
  const { row, column } = cellPosition(index, puzzle.size);
  const region = puzzle.regions[index];
  return {
    top:
      row === 0 ||
      puzzle.regions[cellIndex(row - 1, column, puzzle.size)] !== region,
    right:
      column === puzzle.size - 1 ||
      puzzle.regions[cellIndex(row, column + 1, puzzle.size)] !== region,
    bottom:
      row === puzzle.size - 1 ||
      puzzle.regions[cellIndex(row + 1, column, puzzle.size)] !== region,
    left:
      column === 0 ||
      puzzle.regions[cellIndex(row, column - 1, puzzle.size)] !== region,
  };
}

export function puzzleHasPrivateFields(puzzle) {
  return ["solution", "answer", "seed", "diagnostics"].some(
    (field) => field in puzzle,
  );
}

export function computeBoardSize(viewportWidth, size) {
  const available = Math.max(280, Math.min(560, viewportWidth - 28));
  const cell = Math.floor(available / size);
  return {
    cell,
    board: cell * size,
  };
}
