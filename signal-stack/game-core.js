import {
  boardMetrics,
  canPlaceCells,
  clearLines,
  completeLineIndexes,
  createGrid,
  evaluateLines,
  hasAnyMove,
  placementOriginForTap,
  placeCells,
  resolveGridPieceTap,
  rotateCellsClockwise,
  scorePlacement,
} from "../shared/grid-core.js?v=bf65f8d163c7";

export {
  boardMetrics,
  canPlaceCells,
  createGrid,
  hasAnyMove,
  placementOriginForTap,
  resolveGridPieceTap,
  rotateCellsClockwise,
};

export function drawSignalTarget(length, random) {
  const lower = Math.floor(length * 0.4);
  const upper = Math.ceil(length * 0.6);
  return lower + Math.min(upper - lower, Math.floor(random() * (upper - lower + 1)));
}

export function createSignalTargets(rows, columns, random) {
  return {
    rows: Array.from({ length: rows }, () => drawSignalTarget(columns, random)),
    columns: Array.from(
      { length: columns },
      () => drawSignalTarget(rows, random),
    ),
  };
}

export function advanceTurn({
  grid,
  piece,
  origin,
  rowTargets,
  columnTargets,
  combo,
}) {
  const placed = placeCells(
    grid,
    piece.cells,
    origin,
    (cell) => cell.tone,
  );
  if (!placed) return { ok: false };

  const completed = completeLineIndexes(placed);
  const evaluated = evaluateLines(
    placed,
    completed,
    rowTargets,
    columnTargets,
  );
  const lineCount = completed.rows.length + completed.columns.length;
  const cleanLineCount = [...evaluated.rows, ...evaluated.columns]
    .filter((line) => line.matched).length;
  const scored = scorePlacement({
    pieceSize: piece.cells.length,
    lineCount,
    cleanLineCount,
    previousCombo: combo,
  });

  return {
    ok: true,
    grid: clearLines(placed, completed),
    completed,
    evaluated,
    cleanLineCount,
    points: scored.points,
    nextCombo: scored.nextCombo,
  };
}

export function achievementForScore(score) {
  if (score >= 10000) return "Master Receiver";
  if (score >= 5000) return "Signal Keeper";
  if (score >= 2000) return "Frequency Finder";
  if (score >= 750) return "Clear Channel";
  return "First Transmission";
}

export function safeProgress(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    best: Number.isFinite(source.best) && source.best > 0 ? Math.floor(source.best) : 0,
    runs: Number.isFinite(source.runs) && source.runs > 0 ? Math.floor(source.runs) : 0,
    cleanSignals:
      Number.isFinite(source.cleanSignals) && source.cleanSignals > 0
        ? Math.floor(source.cleanSignals)
        : 0,
  };
}
