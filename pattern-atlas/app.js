import {
  boardMatchesTarget,
  computeLayoutMetrics,
  dimensions,
  placementAllowed,
  resolveTapAction,
  rotateClockwise,
  stablePieceDimensions,
} from "./game-core.js";

const PALETTE = {
  coral: "#e45748",
  blue: "#4f72ff",
  lime: "#d5fe55",
  violet: "#ab76e8",
  orange: "#f2a148",
  teal: "#43b6ad",
};

const LEVELS = {
  warmup: {
    number: "Study 01",
    title: "First light",
    difficulty: "Warm-up",
    size: 3,
    target: [
      ["coral", "blue", "lime"],
      ["blue", "lime", "coral"],
      ["lime", "coral", "blue"],
    ],
    pieces: [
      { id: "a", cells: [[0, 0], [0, 1], [0, 2]], rotation: 1 },
      { id: "b", cells: [[1, 0], [2, 0], [1, 1]], rotation: 2 },
      { id: "c", cells: [[2, 1], [1, 2], [2, 2]], rotation: 3 },
    ],
  },
  daily: {
    number: "Study 02",
    title: "Nocturne grid",
    difficulty: "Daily",
    size: 4,
    target: [
      ["coral", "blue", "blue", "violet"],
      ["coral", "blue", "blue", "violet"],
      ["coral", "coral", "violet", "violet"],
      ["lime", "lime", "orange", "orange"],
    ],
    pieces: [
      { id: "a", cells: [[0, 0], [0, 1], [0, 2], [1, 2]], rotation: 2 },
      { id: "b", cells: [[1, 0], [2, 0], [1, 1], [2, 1]], rotation: 1 },
      { id: "c", cells: [[3, 0], [3, 1], [2, 2], [3, 2]], rotation: 3 },
      { id: "d", cells: [[0, 3], [1, 3]], rotation: 1 },
      { id: "e", cells: [[2, 3], [3, 3]], rotation: 2 },
    ],
  },
  deep: {
    number: "Study 03",
    title: "Afterimage",
    difficulty: "Deep",
    size: 5,
    target: [
      ["coral", "blue", "lime", "blue", "violet"],
      ["blue", "orange", "coral", "lime", "coral"],
      ["lime", "coral", "blue", "violet", "teal"],
      ["violet", "lime", "orange", "blue", "coral"],
      ["coral", "blue", "lime", "orange", "violet"],
    ],
    pieces: [
      { id: "a", cells: [[0, 0], [0, 1], [0, 2], [1, 2]], rotation: 3 },
      { id: "b", cells: [[1, 0], [2, 0], [3, 0], [1, 1]], rotation: 1 },
      { id: "c", cells: [[4, 0], [2, 1], [3, 1], [4, 1]], rotation: 2 },
      { id: "d", cells: [[2, 2], [3, 2], [4, 2], [4, 3]], rotation: 1 },
      { id: "e", cells: [[0, 3], [1, 3], [0, 4], [1, 4]], rotation: 2 },
      { id: "f", cells: [[2, 3], [3, 3], [2, 4], [3, 4], [4, 4]], rotation: 3 },
    ],
  },
  veiled: {
    number: "Study 04",
    title: "Veiled signal",
    difficulty: "Inference",
    size: 5,
    description: "The colored dots in the frame are fixed clues. Cover each one with the same color while fitting every fragment into the board.",
    clues: [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [2, 2], [0, 3], [4, 3], [1, 4], [3, 4]],
    target: [
      ["violet", "blue", "teal", "coral", "violet"],
      ["blue", "orange", "lime", "orange", "blue"],
      ["teal", "lime", "coral", "lime", "teal"],
      ["blue", "orange", "lime", "orange", "coral"],
      ["violet", "blue", "teal", "blue", "lime"],
    ],
    pieces: [
      { id: "a", cells: [[0, 0], [0, 1], [0, 2], [1, 2]], rotation: 1 },
      { id: "b", cells: [[1, 0], [2, 0], [3, 0], [1, 1]], rotation: 3 },
      { id: "c", cells: [[4, 0], [2, 1], [3, 1], [4, 1]], rotation: 2 },
      { id: "d", cells: [[2, 2], [3, 2], [4, 2], [4, 3]], rotation: 1 },
      { id: "e", cells: [[0, 3], [1, 3], [0, 4], [1, 4]], rotation: 3 },
      { id: "f", cells: [[2, 3], [3, 3], [2, 4], [3, 4], [4, 4]], rotation: 2 },
    ],
  },
};

let levelKey = "daily";
let level = null;
let pieces = [];
let rotations = new Map();
let placements = new Map();
let selectedId = null;
let drag = null;
let suppressClick = false;
let tapWasSelected = false;
let previewOrigin = null;
let stageWidth = 390;
let layout = null;

const stage = document.querySelector("#stage");
const target = document.querySelector("#target");
const board = document.querySelector("#board");
const piecesRoot = document.querySelector("#pieces");
const progress = document.querySelector("#progress");
const status = document.querySelector("#status");
const complete = document.querySelector("#complete");
const rotateButton = document.querySelector("#rotate");
const placeButton = document.querySelector("#place");
const preview = document.querySelector("#preview");
const selectionLabel = document.querySelector("#selection-label");
const nextStudyButton = document.querySelector("#next-study");
const replayStudyButton = document.querySelector("#replay-study");

function getPiece(id) { return pieces.find((piece) => piece.id === id); }

function displayCells(piece) {
  let cells = piece.cells.map((cell) => ({ ...cell }));
  for (let index = 0; index < (rotations.get(piece.id) ?? 0); index += 1) cells = rotateClockwise(cells);
  return cells;
}

function makePieces(source) {
  return source.pieces.map((piece) => ({
    id: piece.id,
    cells: piece.cells.map(([x, y]) => ({ x, y, color: PALETTE[source.target[y][x]] })),
  }));
}

function setLevel(nextLevelKey) {
  levelKey = nextLevelKey;
  level = LEVELS[levelKey];
  pieces = makePieces(level);
  rotations = new Map(level.pieces.map((piece) => [piece.id, piece.rotation]));
  placements = new Map();
  selectedId = null;
  drag = null;
  tapWasSelected = false;
  previewOrigin = null;
  complete.hidden = true;
  document.querySelector("#study-number").textContent = level.number;
  document.querySelector("#puzzle-title").textContent = level.title;
  document.querySelector("#difficulty").textContent = level.difficulty;
  document.querySelector("#puzzle-description").textContent = level.description
    ?? "Reassemble the loose color fragments so that every square matches the field above it. Each study has one intended solution.";
  document.querySelector("#field-label").textContent = level.clues ? "partial clue field" : "target field";
  target.ariaLabel = level.clues ? "Partial color clue field" : "Target color field";
  document.querySelector("#completion-copy").textContent = levelKey === "veiled"
    ? "The concealed pattern has been revealed."
    : "The next study is ready when you are.";
  nextStudyButton.textContent = levelKey === "veiled" ? "Back to 01 →" : "Next study →";
  selectionLabel.textContent = "Select a fragment to rotate";
  status.textContent = level.clues
    ? "Study the visible clues, then test one fragment at a time."
    : "Read the target field, then begin with any fragment.";
  document.querySelectorAll("[data-level]").forEach((button) => button.classList.toggle("active", button.dataset.level === levelKey));
  updateLayout();
}

function updateLayout() {
  if (!level) return;
  stageWidth = stage.clientWidth;
  const stableSizes = pieces.map(stablePieceDimensions);
  layout = computeLayoutMetrics({
    stageWidth,
    viewportHeight: window.innerHeight,
    levelSize: level.size,
    stableSizes,
    clueMode: Boolean(level.clues),
  });
  const {
    boardPixels,
    targetPixels,
    trayTop,
    top: boardTop,
  } = layout;
  target.hidden = layout.hideTarget;
  stage.classList.toggle("compact-layout", layout.compact);
  stage.classList.toggle("target-in-board", layout.hideTarget);
  document.querySelector("#field-label").textContent = layout.hideTarget
    ? "clues marked on board"
    : level.clues ? "partial clue field" : "target field";
  stage.style.setProperty("--stage-height", `${layout.height}px`);
  stage.style.setProperty("--board-label-top", `${boardTop - 27}px`);
  stage.style.setProperty("--tray-label-top", `${trayTop - 31}px`);
  stage.style.setProperty("--action-top", `${layout.hideTarget ? 47 : boardTop - 62}px`);
  stage.style.setProperty("--board-top", `${boardTop}px`);
  stage.style.setProperty("--board-left", `${layout.left}px`);
  stage.style.setProperty("--board-size", `${boardPixels}px`);
  board.style.left = `${layout.left}px`;
  board.style.top = `${layout.top}px`;
  board.style.width = `${boardPixels}px`;
  board.style.height = `${boardPixels}px`;
  if (!layout.hideTarget) {
    target.style.left = `${layout.targetLeft}px`;
    target.style.top = `${layout.targetTop}px`;
    target.style.width = `${targetPixels}px`;
    target.style.height = `${targetPixels}px`;
  }
  render();
}

function trayHome(piece, index) {
  const shape = dimensions(displayCells(piece));
  const slot = stageWidth / layout.trayColumns;
  const column = index % layout.trayColumns;
  const row = Math.floor(index / layout.trayColumns);
  return {
    x: slot * column + (slot - shape.width * layout.trayCell) / 2,
    y: layout.trayTop + row * layout.trayRowHeight,
    scale: layout.trayCell,
  };
}

function display(piece, index) {
  if (drag?.id === piece.id && drag.active) return { x: drag.x, y: drag.y, scale: layout.cell };
  const placement = placements.get(piece.id);
  if (placement) return { x: layout.left + placement.x * layout.cell, y: layout.top + placement.y * layout.cell, scale: layout.cell };
  return trayHome(piece, index);
}

function resizePieceElement(button, cells, scale) {
  const shape = dimensions(cells);
  button.style.width = `${shape.width * scale}px`;
  button.style.height = `${shape.height * scale}px`;
  button.querySelectorAll(".tile").forEach((tile, index) => {
    const cell = cells[index];
    tile.style.left = `${cell.x * scale + 1}px`;
    tile.style.top = `${cell.y * scale + 1}px`;
    tile.style.width = `${scale - 2}px`;
    tile.style.height = `${scale - 2}px`;
  });
}

function canPlace(piece, origin) {
  const cells = displayCells(piece);
  const occupied = new Set();
  for (const [id, point] of placements) {
    if (id === piece.id) continue;
    displayCells(getPiece(id)).forEach((cell) => occupied.add(`${cell.x + point.x},${cell.y + point.y}`));
  }
  const constraints = level.clues ?? level.target.flatMap((row, y) =>
    row.map((_, x) => [x, y]),
  );
  const clueColors = new Map(
    constraints.map(([x, y]) => [
      `${x},${y}`,
      PALETTE[level.target[y][x]],
    ]),
  );
  return placementAllowed({
    cells,
    origin,
    size: level.size,
    occupied,
    clueColors,
  });
}

function placedCells() {
  const cells = [];
  for (const [id, origin] of placements) {
    displayCells(getPiece(id)).forEach((cell) => {
      cells.push({ x: cell.x + origin.x, y: cell.y + origin.y, color: cell.color });
    });
  }
  return cells;
}

function boardMatchesSolution() {
  const targetColors = new Map(
    level.target.flatMap((row, y) => row.map((color, x) => [`${x},${y}`, PALETTE[color]])),
  );
  return boardMatchesTarget({
    size: level.size,
    targetColors,
    placedCells: placedCells(),
  });
}

function place(piece, origin) {
  if (!canPlace(piece, origin)) return false;
  placements.set(piece.id, origin);
  selectedId = piece.id;
  previewOrigin = null;
  const solved = checkComplete();
  status.textContent = solved
    ? "Pattern restored."
    : placements.size === pieces.length
      ? "The frame is full, but the pattern still contradicts itself. Rotate or move one fragment."
      : "That fragment belongs. Keep going.";
  render();
  return true;
}

function rotatePiece(piece) {
  if (!piece || !complete.hidden) return;
  placements.delete(piece.id);
  rotations.set(piece.id, ((rotations.get(piece.id) ?? 0) + 1) % 4);
  previewOrigin = null;
  status.textContent = "Rotated. Compare its color sequence with the target field.";
  updateLayout();
}

function checkComplete() {
  progress.textContent = `${placements.size} / ${pieces.length} fragments`;
  const solved = placements.size === pieces.length && boardMatchesSolution();
  complete.hidden = !solved;
  return solved;
}

function renderTarget() {
  target.innerHTML = "";
  target.style.gridTemplateColumns = `repeat(${level.size}, 1fr)`;
  const clueKeys = new Set((level.clues ?? []).map(([x, y]) => `${x},${y}`));
  level.target.flat().forEach((color, index) => {
    const x = index % level.size;
    const y = Math.floor(index / level.size);
    const concealed = level.clues && complete.hidden && !clueKeys.has(`${x},${y}`);
    const tile = document.createElement("span");
    tile.className = `target-tile${concealed ? " concealed" : ""}`;
    if (!concealed) tile.style.background = PALETTE[color];
    target.append(tile);
  });
}

function renderBoard() {
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${level.size}, 1fr)`;
  const clueKeys = new Set((level.clues ?? []).map(([x, y]) => `${x},${y}`));
  for (let y = 0; y < level.size; y += 1) {
    for (let x = 0; x < level.size; x += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      const clue = clueKeys.has(`${x},${y}`);
      if (clue) {
        cell.classList.add("clue-cell");
        cell.style.setProperty("--clue-color", PALETTE[level.target[y][x]]);
      }
      cell.ariaLabel = `${clue ? `${level.target[y][x]} clue. ` : ""}Place selected fragment at row ${y + 1}, column ${x + 1}`;
      cell.addEventListener("click", () => {
        const piece = getPiece(selectedId);
        if (!piece || !complete.hidden) return;
        previewOrigin = { x, y };
        status.textContent = canPlace(piece, previewOrigin)
          ? "Preview ready. Press Place when it looks right."
          : "This preview does not fit. Rotate it or choose another square.";
        render();
      });
      board.append(cell);
    }
  }
}

function renderPreview() {
  preview.innerHTML = "";
  if (!selectedId || !previewOrigin || !complete.hidden) return;
  const piece = getPiece(selectedId);
  if (!piece) return;
  const cells = displayCells(piece);
  const valid = canPlace(piece, previewOrigin);
  preview.className = `preview ${valid ? "valid" : "invalid"}`;
  cells.forEach((cell) => {
    const tile = document.createElement("span");
    tile.className = "preview-tile";
    tile.style.left = `${layout.left + (previewOrigin.x + cell.x) * layout.cell + 1}px`;
    tile.style.top = `${layout.top + (previewOrigin.y + cell.y) * layout.cell + 1}px`;
    tile.style.width = `${layout.cell - 2}px`;
    tile.style.height = `${layout.cell - 2}px`;
    tile.style.background = cell.color;
    preview.append(tile);
  });
}

function renderPieces() {
  piecesRoot.innerHTML = "";
  pieces.forEach((piece, index) => {
    const view = display(piece, index);
    const cells = displayCells(piece);
    const shape = dimensions(cells);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.pieceId = piece.id;
    button.className = `piece${selectedId === piece.id ? " selected" : ""}${drag?.id === piece.id && drag.active ? " dragging" : ""}`;
    const isSelected = selectedId === piece.id;
    button.ariaLabel = `Fragment ${index + 1}, ${placements.has(piece.id) ? "placed" : "loose"}. ${isSelected ? "Selected. Tap again to rotate." : "Tap to select."}`;
    button.style.width = `${shape.width * view.scale}px`;
    button.style.height = `${shape.height * view.scale}px`;
    button.style.transform = `translate3d(${view.x}px, ${view.y}px, 0)`;
    cells.forEach((cell) => {
      const tile = document.createElement("span");
      tile.className = "tile";
      tile.style.left = `${cell.x * view.scale + 1}px`;
      tile.style.top = `${cell.y * view.scale + 1}px`;
      tile.style.width = `${view.scale - 2}px`;
      tile.style.height = `${view.scale - 2}px`;
      tile.style.background = cell.color;
      button.append(tile);
    });
    button.addEventListener("pointerdown", (event) => beginDrag(event, piece, index));
    button.addEventListener("pointermove", moveDrag);
    button.addEventListener("pointerup", endDrag);
    button.addEventListener("pointercancel", () => {
      drag = null;
      tapWasSelected = false;
      render();
    });
    button.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false;
        tapWasSelected = false;
        return;
      }
      if (!drag?.moved) {
        const action = resolveTapAction({
          wasSelected: tapWasSelected,
          selectedId,
          pieceId: piece.id,
        });
        if (action === "rotate") {
          tapWasSelected = false;
          rotatePiece(piece);
        } else {
          tapWasSelected = false;
          selectedId = piece.id;
          previewOrigin = null;
          status.textContent = "Selected. Tap it again to rotate, or choose a square to preview.";
          render();
        }
      }
    });
    piecesRoot.append(button);
  });
}

function render() {
  if (!layout) return;
  renderTarget();
  renderBoard();
  renderPreview();
  renderPieces();
  rotateButton.disabled = !selectedId || !complete.hidden;
  placeButton.disabled = !selectedId || !previewOrigin || !complete.hidden || !canPlace(getPiece(selectedId), previewOrigin);
  selectionLabel.textContent = selectedId
    ? `Fragment ${pieces.findIndex((piece) => piece.id === selectedId) + 1} selected · tap again to rotate`
    : "Select a fragment to rotate";
  checkComplete();
}

function beginDrag(event, piece, index) {
  if (!complete.hidden) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  tapWasSelected = selectedId === piece.id;
  const rect = stage.getBoundingClientRect();
  const current = display(piece, index);
  const shape = dimensions(displayCells(piece));
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const grabX = Math.max(0, Math.min(1, (localX - current.x) / (shape.width * current.scale)));
  const grabY = Math.max(0, Math.min(1, (localY - current.y) / (shape.height * current.scale)));
  drag = {
    id: piece.id,
    index,
    pointerId: event.pointerId,
    grabX,
    grabY,
    startX: localX,
    startY: localY,
    x: localX - grabX * shape.width * layout.cell,
    y: localY - grabY * shape.height * layout.cell,
    active: false,
  };
}

function moveDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const piece = getPiece(drag.id);
  const shape = dimensions(displayCells(piece));
  const rect = stage.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  if (!drag.active && Math.hypot(localX - drag.startX, localY - drag.startY) <= 9) return;
  if (!drag.active) {
    event.preventDefault();
    drag.active = true;
    selectedId = piece.id;
    previewOrigin = null;
    piecesRoot.querySelectorAll(".piece.selected").forEach((item) => item.classList.remove("selected"));
    event.currentTarget.classList.add("selected", "dragging");
    resizePieceElement(event.currentTarget, displayCells(piece), layout.cell);
    selectionLabel.textContent = `Fragment ${drag.index + 1} selected`;
    rotateButton.disabled = false;
  }
  drag = { ...drag, x: localX - drag.grabX * shape.width * layout.cell, y: localY - drag.grabY * shape.height * layout.cell };
  event.currentTarget.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0)`;
}

function endDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  if (!drag.active) {
    drag = null;
    return;
  }
  const piece = getPiece(drag.id);
  const rect = stage.getBoundingClientRect();
  const shape = dimensions(displayCells(piece));
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const x = localX - drag.grabX * shape.width * layout.cell;
  const y = localY - drag.grabY * shape.height * layout.cell;
  drag = null;
  suppressClick = true;
  window.setTimeout(() => { suppressClick = false; }, 300);
  const origin = { x: Math.round((x - layout.left) / layout.cell), y: Math.round((y - layout.top) / layout.cell) };
  if (!place(piece, origin)) {
    status.textContent = level.clues
      ? "That conflicts with a visible clue, another fragment, or the frame edge."
      : "That fragment does not echo the target field. Try another position or rotate it.";
  }
  render();
}

document.querySelector("#reset").addEventListener("click", () => setLevel(levelKey));
rotateButton.addEventListener("click", () => {
  const piece = getPiece(selectedId);
  tapWasSelected = false;
  rotatePiece(piece);
});
placeButton.addEventListener("click", () => {
  const piece = getPiece(selectedId);
  if (!piece || !previewOrigin || !complete.hidden) return;
  if (!place(piece, previewOrigin)) {
    status.textContent = "That placement no longer fits. Rotate it or choose another square.";
    render();
  }
});
nextStudyButton.addEventListener("click", () => {
  const order = ["warmup", "daily", "deep", "veiled"];
  const current = order.indexOf(levelKey);
  setLevel(order[(current + 1) % order.length]);
});
replayStudyButton.addEventListener("click", () => setLevel(levelKey));
document.querySelectorAll("[data-level]").forEach((button) => button.addEventListener("click", () => setLevel(button.dataset.level)));

new ResizeObserver(updateLayout).observe(stage);
setLevel(levelKey);
