import {
  achievementForScore,
  advanceTurn,
  canPlaceCells,
  createGrid,
  createSignalTargets,
  drawSignalTarget,
  hasAnyMove,
  placementOriginForTap,
  resolveGridPieceTap,
  rotateCellsClockwise,
  safeProgress,
} from "./game-core.js?v=6b5b81472a7a";
import { drawPiece } from "./piece-deck.js?v=6b5b81472a7a";
import {
  scoreText,
  scoreUrl,
  shareChallenge,
} from "../shared/share-core.js?v=6b5b81472a7a";

const ROWS = 8;
const COLUMNS = 7;
const TRAY_SIZE = 3;
const STORAGE_KEY = "leslie-play:signal-stack:v1";

const boardRoot = document.querySelector("#board");
const trayRoot = document.querySelector("#piece-tray");
const rowCluesRoot = document.querySelector("#row-clues");
const columnCluesRoot = document.querySelector("#column-clues");
const scoreRoot = document.querySelector("#score");
const bestRoot = document.querySelector("#best");
const comboRoot = document.querySelector("#combo");
const messageRoot = document.querySelector("#message");
const flashRoot = document.querySelector("#signal-flash");
const rotateButton = document.querySelector("#rotate-piece");
const newRunButton = document.querySelector("#new-run");
const gameOverRoot = document.querySelector("#game-over");
const finalScoreRoot = document.querySelector("#final-score");
const runTitleRoot = document.querySelector("#run-title");
const restartButton = document.querySelector("#restart-run");
const shareButton = document.querySelector("#share-score");
const shareStatus = document.querySelector("#share-status");

function randomUnit() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function loadProgress() {
  try {
    return safeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    return safeProgress({});
  }
}

let progress = loadProgress();
let grid = createGrid(ROWS, COLUMNS);
let targets = createSignalTargets(ROWS, COLUMNS, randomUnit);
let tray = [];
let pieceSerial = 0;
let selectedId = null;
let hoverOrigin = null;
let score = 0;
let combo = 0;
let cleanThisRun = 0;
let active = true;
let flashTimer = null;
let rejectTimer = null;

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Local storage is optional. The run must remain fully playable without it.
  }
}

function nextPiece() {
  pieceSerial += 1;
  return drawPiece(randomUnit, `piece-${pieceSerial}`);
}

function refillTray() {
  tray = Array.from({ length: TRAY_SIZE }, nextPiece);
}

function selectedPiece() {
  return tray.find((piece) => piece.id === selectedId) ?? null;
}

function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, "0");
}

function setMessage(text) {
  messageRoot.textContent = text;
}

function showFlash(text) {
  clearTimeout(flashTimer);
  flashRoot.textContent = text;
  flashRoot.hidden = false;
  flashTimer = setTimeout(() => {
    flashRoot.hidden = true;
  }, 1100);
}

function updateTargets(completed) {
  completed.rows.forEach((index) => {
    targets.rows[index] = drawSignalTarget(COLUMNS, randomUnit);
  });
  completed.columns.forEach((index) => {
    targets.columns[index] = drawSignalTarget(ROWS, randomUnit);
  });
}

function startRun() {
  grid = createGrid(ROWS, COLUMNS);
  targets = createSignalTargets(ROWS, COLUMNS, randomUnit);
  refillTray();
  selectedId = null;
  hoverOrigin = null;
  score = 0;
  combo = 0;
  cleanThisRun = 0;
  active = true;
  gameOverRoot.hidden = true;
  shareStatus.textContent = "";
  setMessage("1 Pick a piece · 2 tap it again to rotate · 3 tap its center.");
  render();
}

function finishRun() {
  active = false;
  selectedId = null;
  hoverOrigin = null;
  progress = {
    best: Math.max(progress.best, score),
    runs: progress.runs + 1,
    cleanSignals: progress.cleanSignals + cleanThisRun,
  };
  saveProgress();
  const title = achievementForScore(score);
  finalScoreRoot.textContent = score.toLocaleString("en-US");
  runTitleRoot.textContent = title;
  gameOverRoot.hidden = false;
  setMessage("No piece fits. The receiver is resting.");
  render();
}

function selectOrRotate(pieceId) {
  if (!active) return;
  const piece = tray.find((entry) => entry.id === pieceId);
  if (!piece) return;
  const action = resolveGridPieceTap(selectedId, pieceId);
  selectedId = pieceId;
  hoverOrigin = null;
  if (action === "rotate") {
    piece.cells = rotateCellsClockwise(piece.cells);
    setMessage("Rotated 90°. Tap the board to place.");
  } else {
    setMessage("Selected. Tap again to rotate, or tap the board to place.");
  }
  render();
}

function rotateSelected() {
  const piece = selectedPiece();
  if (!piece || !active) return;
  piece.cells = rotateCellsClockwise(piece.cells);
  hoverOrigin = null;
  setMessage("Rotated 90°. Tap the board to place.");
  render();
}

function placeSelected(origin) {
  const piece = selectedPiece();
  if (!piece || !active) {
    setMessage("Select one of the incoming pieces first.");
    return;
  }
  const fittedOrigin = placementOriginForTap(grid, piece.cells, origin);
  const result = advanceTurn({
    grid,
    piece,
    origin: fittedOrigin,
    rowTargets: targets.rows,
    columnTargets: targets.columns,
    combo,
  });
  if (!result.ok) {
    hoverOrigin = fittedOrigin;
    clearTimeout(rejectTimer);
    boardRoot.classList.remove("is-rejected");
    void boardRoot.offsetWidth;
    boardRoot.classList.add("is-rejected");
    rejectTimer = setTimeout(() => boardRoot.classList.remove("is-rejected"), 420);
    setMessage("Red outline = blocked. Your piece is still selected—tap another spot.");
    render();
    return;
  }

  grid = result.grid;
  score += result.points;
  combo = result.nextCombo;
  cleanThisRun += result.cleanLineCount;
  updateTargets(result.completed);
  tray = tray.filter((entry) => entry.id !== piece.id);
  selectedId = null;
  hoverOrigin = null;

  const lineCount = result.completed.rows.length + result.completed.columns.length;
  if (result.cleanLineCount > 0) {
    const label = result.cleanLineCount > 1
      ? `${result.cleanLineCount} CLEAN SIGNALS · ×${combo}`
      : `CLEAN SIGNAL · ×${combo}`;
    showFlash(label);
    setMessage("Exact frequency matched. The chain is growing.");
  } else if (lineCount > 0) {
    showFlash(`${lineCount} LINE${lineCount === 1 ? "" : "S"} CLEARED`);
    setMessage("Space cleared. Match the edge numbers for a clean signal.");
  } else {
    setMessage("Piece locked. Keep a path open for the next three.");
  }

  if (tray.length === 0) refillTray();
  if (!hasAnyMove(grid, tray)) {
    finishRun();
    return;
  }
  render();
}

function previewKeys() {
  const piece = selectedPiece();
  if (!piece || !hoverOrigin) return { valid: false, keys: new Set() };
  const valid = canPlaceCells(grid, piece.cells, hoverOrigin);
  return {
    valid,
    keys: new Set(
      piece.cells.map((cell) =>
        `${hoverOrigin.x + cell.x},${hoverOrigin.y + cell.y}`),
    ),
  };
}

function renderClues() {
  columnCluesRoot.replaceChildren(
    ...targets.columns.map((target) => {
      const clue = document.createElement("span");
      clue.textContent = target;
      clue.title = `${target} green cells for a clean column signal`;
      return clue;
    }),
  );
  rowCluesRoot.replaceChildren(
    ...targets.rows.map((target) => {
      const clue = document.createElement("span");
      clue.textContent = target;
      clue.title = `${target} green cells for a clean row signal`;
      return clue;
    }),
  );
}

function renderBoard() {
  const cells = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLUMNS; x += 1) {
      const cell = document.createElement("button");
      const tone = grid[y][x];
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.ariaLabel = tone
        ? `${tone} signal cell, row ${y + 1}, column ${x + 1}`
        : `Empty cell, row ${y + 1}, column ${x + 1}`;
      if (tone) cell.classList.add(`tone-${tone}`);
      cells.push(cell);
    }
  }
  boardRoot.replaceChildren(...cells);
  applyBoardPreview();
}

function applyBoardPreview() {
  const preview = previewKeys();
  boardRoot.querySelectorAll(".cell").forEach((cell) => {
    const key = `${cell.dataset.x},${cell.dataset.y}`;
    cell.classList.remove("preview-valid", "preview-invalid");
    if (preview.keys.has(key)) {
      cell.classList.add(preview.valid ? "preview-valid" : "preview-invalid");
    }
  });
}

function pieceBounds(cells) {
  return {
    width: Math.max(...cells.map((cell) => cell.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.y)) + 1,
  };
}

function renderTray() {
  const buttons = tray.map((piece) => {
    const button = document.createElement("button");
    const bounds = pieceBounds(piece.cells);
    button.type = "button";
    button.className = "piece";
    button.dataset.pieceId = piece.id;
    button.ariaLabel = `${piece.name} signal piece${piece.id === selectedId ? ", selected" : ""}`;
    button.ariaPressed = piece.id === selectedId ? "true" : "false";
    if (piece.id === selectedId) button.classList.add("selected");
    piece.cells.forEach((cell) => {
      const tile = document.createElement("span");
      tile.className = `piece-cell ${cell.tone}`;
      tile.style.setProperty(
        "--dx",
        `${(cell.x - (bounds.width - 1) / 2) * 22}px`,
      );
      tile.style.setProperty(
        "--dy",
        `${(cell.y - (bounds.height - 1) / 2) * 22}px`,
      );
      button.append(tile);
    });
    return button;
  });
  trayRoot.replaceChildren(...buttons);
}

function render() {
  scoreRoot.textContent = formatScore(score);
  bestRoot.textContent = formatScore(Math.max(progress.best, score));
  comboRoot.textContent = `×${combo}`;
  rotateButton.disabled = !active || !selectedPiece();
  renderClues();
  renderBoard();
  renderTray();
}

async function shareRun() {
  const title = achievementForScore(score);
  const result = await shareChallenge({
    navigatorLike: navigator,
    title: `Signal Stack — ${title}`,
    text: scoreText({
      achievement: title,
      gameName: "Signal Stack",
      score,
      cleanCount: cleanThisRun,
    }),
    url: scoreUrl(location),
  });
  shareStatus.textContent =
    result === "shared"
      ? "Signal sent."
      : result === "copied"
        ? "Score copied."
        : result === "cancelled"
          ? ""
          : "Sharing is unavailable here.";
}

trayRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-piece-id]");
  if (button) selectOrRotate(button.dataset.pieceId);
});
function activateBoardCell(event) {
  const cell = event.target.closest("[data-x][data-y]");
  if (cell) placeSelected({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
}

boardRoot.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  activateBoardCell(event);
});
boardRoot.addEventListener("click", (event) => {
  if (event.detail === 0) activateBoardCell(event);
});
boardRoot.addEventListener("pointerover", (event) => {
  const cell = event.target.closest("[data-x][data-y]");
  if (!cell || event.pointerType === "touch") return;
  const piece = selectedPiece();
  const pointer = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
  hoverOrigin = piece
    ? placementOriginForTap(grid, piece.cells, pointer)
    : pointer;
  applyBoardPreview();
});
boardRoot.addEventListener("pointerleave", () => {
  hoverOrigin = null;
  applyBoardPreview();
});
rotateButton.addEventListener("click", rotateSelected);
newRunButton.addEventListener("click", startRun);
restartButton.addEventListener("click", startRun);
shareButton.addEventListener("click", shareRun);

startRun();
