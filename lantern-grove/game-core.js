export const CELL_EMPTY = 0;
export const CELL_MARK = 1;
export const CELL_LANTERN = 2;

export function createGameState(puzzle) {
  return {
    puzzle,
    cells: Array(puzzle.size * puzzle.size).fill(CELL_EMPTY),
    moves: 0,
  };
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
