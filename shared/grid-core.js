export function normalizeCells(cells) {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({
    ...cell,
    x: cell.x - minX,
    y: cell.y - minY,
  }));
}

export function rotateCellsClockwise(cells) {
  const maxY = Math.max(...cells.map((cell) => cell.y));
  return normalizeCells(cells.map((cell) => ({
    ...cell,
    x: maxY - cell.y,
    y: cell.x,
  })));
}

export function uniqueRotations(cells) {
  const rotations = [];
  const seen = new Set();
  let current = normalizeCells(cells);
  for (let turn = 0; turn < 4; turn += 1) {
    const key = current
      .map((cell) => `${cell.x},${cell.y},${cell.tone ?? ""}`)
      .sort()
      .join("|");
    if (!seen.has(key)) {
      seen.add(key);
      rotations.push(current);
    }
    current = rotateCellsClockwise(current);
  }
  return rotations;
}

export function createGrid(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(null));
}

export function canPlaceCells(grid, cells, origin) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return cells.every((cell) => {
    const x = origin.x + cell.x;
    const y = origin.y + cell.y;
    return (
      x >= 0 &&
      y >= 0 &&
      x < columns &&
      y < rows &&
      grid[y][x] === null
    );
  });
}

export function placeCells(grid, cells, origin, valueForCell = (cell) => cell.tone) {
  if (!canPlaceCells(grid, cells, origin)) return null;
  const next = grid.map((row) => [...row]);
  cells.forEach((cell) => {
    next[origin.y + cell.y][origin.x + cell.x] = valueForCell(cell);
  });
  return next;
}

export function completeLineIndexes(grid) {
  const rows = [];
  const columns = [];
  const columnCount = grid[0]?.length ?? 0;

  grid.forEach((row, index) => {
    if (row.every((cell) => cell !== null)) rows.push(index);
  });
  for (let x = 0; x < columnCount; x += 1) {
    if (grid.every((row) => row[x] !== null)) columns.push(x);
  }
  return { rows, columns };
}

export function evaluateLines(
  grid,
  completed,
  rowTargets,
  columnTargets,
  targetTone = "light",
) {
  const rowResults = completed.rows.map((index) => {
    const count = grid[index].filter((cell) => cell === targetTone).length;
    return { index, count, target: rowTargets[index], matched: count === rowTargets[index] };
  });
  const columnResults = completed.columns.map((index) => {
    const count = grid.filter((row) => row[index] === targetTone).length;
    return {
      index,
      count,
      target: columnTargets[index],
      matched: count === columnTargets[index],
    };
  });
  return { rows: rowResults, columns: columnResults };
}

export function clearLines(grid, completed) {
  const rowSet = new Set(completed.rows);
  const columnSet = new Set(completed.columns);
  return grid.map((row, y) =>
    row.map((cell, x) => (rowSet.has(y) || columnSet.has(x) ? null : cell)),
  );
}

export function hasPlacement(grid, cells) {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  return uniqueRotations(cells).some((rotation) => {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (canPlaceCells(grid, rotation, { x, y })) return true;
      }
    }
    return false;
  });
}

export function hasAnyMove(grid, pieces) {
  return pieces.some((piece) => hasPlacement(grid, piece.cells));
}

export function resolveGridPieceTap(selectedId, pieceId) {
  return selectedId === pieceId ? "rotate" : "select";
}

export function scorePlacement({
  pieceSize,
  lineCount,
  cleanLineCount,
  previousCombo,
}) {
  const nextCombo = lineCount > 0 ? previousCombo + 1 : 0;
  const placementPoints = pieceSize * 5;
  const linePoints = lineCount * 100;
  const cleanPoints = cleanLineCount * 150;
  const multiLinePoints = Math.max(0, lineCount - 1) * 75;
  const clearPoints =
    (linePoints + cleanPoints + multiLinePoints) * Math.max(1, nextCombo);
  return {
    points: placementPoints + clearPoints,
    nextCombo,
  };
}

export function boardMetrics({
  viewportWidth,
  rows = 8,
  columns = 7,
}) {
  const cell = Math.max(36, Math.min(48, Math.floor((viewportWidth - 68) / columns)));
  return {
    cell,
    boardWidth: cell * columns,
    boardHeight: cell * rows,
    interactiveHeight: cell * rows + 246,
  };
}
