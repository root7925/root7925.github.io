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
} from "./game-core.js?v=6b54e696ee1e";
import { COLLECTION } from "./collection-01.js?v=6b54e696ee1e";
import {
  achievementFor,
  challengeText,
  challengeUrl,
  shareChallenge,
  renderShareCard,
  shareCardImage,
} from "../shared/share-core.js?v=6b54e696ee1e";
import { createI18n, mountLangSwitcher } from "../shared/i18n.js?v=6b54e696ee1e";
import { messages } from "./i18n-messages.js?v=6b54e696ee1e";

const { t, apply, onLangChange } = createI18n(messages);

const PALETTE = {
  coral: "#e45748",
  blue: "#4f72ff",
  lime: "#d5fe55",
  violet: "#ab76e8",
  orange: "#f2a148",
  teal: "#43b6ad",
};

const LEVELS = Object.fromEntries(
  COLLECTION.levels.map((entry) => [entry.id, entry]),
);
const LEVEL_ORDER = COLLECTION.levels.map((entry) => entry.id);
const STORAGE_KEY = "leslie-play:pattern-atlas:collection-01";
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

const savedProgress = loadProgress();
const completedIds = new Set(
  Array.isArray(savedProgress.completed)
    ? savedProgress.completed.filter((id) => LEVELS[id])
    : [],
);
const firstIncomplete =
  LEVEL_ORDER.find((id) => !completedIds.has(id)) ?? LEVEL_ORDER[0];
const requestedStudy = Number(new URLSearchParams(location.search).get("study"));
const requestedLevelKey =
  Number.isInteger(requestedStudy) &&
  requestedStudy >= 1 &&
  requestedStudy <= LEVEL_ORDER.length
    ? LEVEL_ORDER[requestedStudy - 1]
    : null;

let levelKey = requestedLevelKey ??
  (LEVELS[savedProgress.lastStudy] ? savedProgress.lastStudy : firstIncomplete);
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
let completionPresented = false;
const ATLAS_TITLES = [
  { threshold: 1, title: "Pattern Reader" },
  { threshold: 4, title: "Atlas Apprentice" },
  { threshold: 8, title: "Field Restorer" },
  { threshold: 12, title: "Pattern Cartographer" },
  { threshold: 16, title: "Keeper of the Atlas" },
];

const stage = document.querySelector("#stage");
const target = document.querySelector("#target");
const board = document.querySelector("#board");
const piecesRoot = document.querySelector("#pieces");
const progress = document.querySelector("#progress");
const status = document.querySelector("#status");
const complete = document.querySelector("#complete");
const rotateButton = document.querySelector("#rotate");
const preview = document.querySelector("#preview");
const selectionLabel = document.querySelector("#selection-label");
const nextStudyButton = document.querySelector("#next-study");
const replayStudyButton = document.querySelector("#replay-study");
const shareButton = document.querySelector("#share-challenge");
const shareStatus = document.querySelector("#share-status");
const shareCardCanvas = document.querySelector("#share-card");
const shareCardWrap = document.querySelector(".share-card-wrap");
const achievementTitle = document.querySelector("#achievement-title");
const previousStudyButton = document.querySelector("#previous-study");
const followingStudyButton = document.querySelector("#following-study");
const levelCount = document.querySelector("#level-count");
const collectionProgress = document.querySelector("#collection-progress");

function getPiece(id) { return pieces.find((piece) => piece.id === id); }
function currentLevelIndex() { return LEVEL_ORDER.indexOf(levelKey); }
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completed: [...completedIds],
      lastStudy: levelKey,
    }));
  } catch {
    // Some private browsing modes disable storage; play should still continue.
  }
}

function updateCollectionProgress() {
  collectionProgress.textContent = t("collection.progress", completedIds.size, LEVEL_ORDER.length);
}

// Tracks the active status message key so it can be re-translated on language change.
let currentStatusKey = "status.dragFragment";
function setStatus(key) {
  currentStatusKey = key;
  status.textContent = t(key);
}

function displayCells(piece) {
  let cells = piece.cells.map((cell) => ({ ...cell }));
  for (let index = 0; index < (rotations.get(piece.id) ?? 0); index += 1) cells = rotateClockwise(cells);
  return cells;
}

function makePieces(source) {
  return source.pieces.map((piece) => ({
    id: piece.id,
    allowedRotations: piece.allowedRotations ?? [0, 1, 2, 3],
    cells: piece.cells.map(([x, y, color]) => ({
      x,
      y,
      color: PALETTE[color ?? source.target[y][x]],
    })),
  }));
}

function applyLevelText() {
  const displayIndex = currentLevelIndex();
  document.querySelector("#study-number").textContent = t("study.number", String(displayIndex + 1).padStart(2, "0"));
  document.querySelector("#puzzle-title").textContent = level.title;
  document.querySelector("#difficulty").textContent = `${t("chapter." + level.chapter)} · ${t("difficulty." + level.difficulty)}`;
  document.querySelector("#puzzle-description").textContent = level.description
    ?? (level.mode === "clues" ? t("description.clues") : t("description.default"));
  target.ariaLabel = level.mode === "clues" ? t("target.ariaClue") : t("target.ariaTarget");
  const isLast = displayIndex === LEVEL_ORDER.length - 1;
  document.querySelector("#completion-copy").textContent = isLast ? t("complete.copy.last") : t("complete.copy.next");
  nextStudyButton.textContent = isLast ? t("complete.next.last") : t("complete.next.next");
}

function renderFieldLabel() {
  document.querySelector("#field-label").textContent = layout.hideTarget
    ? t("field.cluesOnBoard")
    : level.mode === "clues" ? t("field.partialClue") : t("field.target");
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
  completionPresented = false;
  complete.hidden = true;
  shareStatus.textContent = "";
  saveProgress();
  applyLevelText();
  selectionLabel.textContent = t("selection.default");
  setStatus(level.mode === "clues" ? "status.studyClues" : "status.readTarget");
  const displayIndex = currentLevelIndex();
  levelCount.textContent = `${String(displayIndex + 1).padStart(2, "0")} / ${LEVEL_ORDER.length}`;
  previousStudyButton.disabled = displayIndex === 0;
  followingStudyButton.disabled = displayIndex === LEVEL_ORDER.length - 1;
  updateCollectionProgress();
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
    clueMode: level.mode === "clues",
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
  renderFieldLabel();
  stage.style.setProperty("--stage-height", `${layout.height}px`);
  stage.style.setProperty("--board-label-top", `${boardTop - 27}px`);
  stage.style.setProperty("--tray-label-top", `${trayTop - 31}px`);
  stage.style.setProperty("--action-top", `${layout.hideTarget ? 56 : boardTop - 62}px`);
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
  setStatus(solved
    ? "status.restored"
    : placements.size === pieces.length
      ? "status.fullButConflict"
      : "status.belongs");
  render();
  return true;
}

function rotatePiece(piece) {
  if (!piece || !complete.hidden) return;
  const allowed = piece.allowedRotations;
  if (allowed.length < 2) {
    setStatus("status.fixedOrientation");
    render();
    return;
  }
  placements.delete(piece.id);
  const current = rotations.get(piece.id) ?? allowed[0];
  rotations.set(piece.id, nextAllowedRotation(current, allowed));
  previewOrigin = null;
  setStatus("status.rotated");
  updateLayout();
}

function checkComplete() {
  progress.textContent = t("progress", placements.size, pieces.length);
  const solved = placements.size === pieces.length && boardMatchesSolution();
  complete.hidden = !solved;
  if (solved && !completionPresented) {
    if (!completedIds.has(levelKey)) {
      completedIds.add(levelKey);
      saveProgress();
      updateCollectionProgress();
    }
    const achievement = achievementFor(completedIds.size, ATLAS_TITLES);
    achievementTitle.textContent = achievement;
    renderShareCard(shareCardCanvas, {
      achievement,
      gameName: "Pattern Atlas",
      puzzleLabel: `Study ${String(currentLevelIndex() + 1).padStart(2, "0")}`,
      detail: `${level.chapter} · ${level.difficulty}`,
      accent: "#d5fe55",
      background: "#111722",
    });
    shareCardWrap.hidden = false;
    shareStatus.textContent = "";
    completionPresented = true;
  }
  return solved;
}

async function shareCurrentChallenge() {
  const studyNumber = currentLevelIndex() + 1;
  const text = challengeText({
    achievement: achievementFor(completedIds.size, ATLAS_TITLES),
    gameName: "Pattern Atlas",
    puzzleLabel: `Study ${String(studyNumber).padStart(2, "0")}`,
    detail: `${level.chapter} · ${level.difficulty}`,
  });
  const url = challengeUrl(location, "study", studyNumber);
  const result = await shareCardImage({
    navigatorLike: navigator,
    canvas: shareCardCanvas,
    title: "Pattern Atlas challenge",
    text,
    url,
    fileName: `pattern-atlas-study-${studyNumber}.png`,
  });
  if (result === "unavailable") {
    const fallback = await shareChallenge({
      navigatorLike: navigator,
      title: "Pattern Atlas challenge",
      text,
      url,
    });
    shareStatus.textContent =
      fallback === "shared"
        ? t("share.challengeSent")
        : fallback === "copied"
          ? t("share.challengeCopied")
          : fallback === "cancelled"
            ? ""
            : t("share.unavailable");
    return;
  }
  shareStatus.textContent =
    result === "shared"
      ? t("share.sent")
      : result === "copied"
        ? t("share.copied")
        : result === "downloaded"
          ? t("share.downloaded")
          : result === "cancelled"
            ? ""
            : t("share.unavailable");
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
      cell.ariaLabel = clue
        ? t("cell.ariaClue", level.target[y][x], y + 1, x + 1)
        : t("cell.aria", y + 1, x + 1);
      cell.addEventListener("click", () => {
        const piece = getPiece(selectedId);
        if (!piece || !complete.hidden) return;
        const origin = placementOriginForTap({
          cells: displayCells(piece),
          tap: { x, y },
          size: level.size,
          isAllowed: (candidate) => canPlace(piece, candidate),
        });
        const action = resolveBoardTap({
          hasSelection: Boolean(piece),
          placementIsValid: canPlace(piece, origin),
        });
        if (action === "place") {
          tapWasSelected = false;
          place(piece, origin);
          return;
        }
        previewOrigin = origin;
        setStatus("status.doesNotFit");
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
    button.ariaLabel = t(
      "piece.aria",
      index + 1,
      placements.has(piece.id) ? t("piece.placed") : t("piece.loose"),
      isSelected ? t("piece.selectedHint") : t("piece.tapHint"),
    );
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
          setStatus("status.selected");
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
  if (selectedId && getPiece(selectedId)?.allowedRotations.length < 2) {
    rotateButton.disabled = true;
  }
  selectionLabel.textContent = selectedId
    ? getPiece(selectedId)?.allowedRotations.length > 1
      ? t("selection.selected", pieces.findIndex((piece) => piece.id === selectedId) + 1)
      : t("selection.fixed", pieces.findIndex((piece) => piece.id === selectedId) + 1)
    : t("selection.default");
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
    selectionLabel.textContent = t("selection.dragging", drag.index + 1);
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
    setStatus(level.clues ? "status.conflictClues" : "status.noEcho");
  }
  render();
}

document.querySelector("#reset").addEventListener("click", () => setLevel(levelKey));
rotateButton.addEventListener("click", () => {
  const piece = getPiece(selectedId);
  tapWasSelected = false;
  rotatePiece(piece);
});
nextStudyButton.addEventListener("click", () => {
  const current = currentLevelIndex();
  setLevel(LEVEL_ORDER[(current + 1) % LEVEL_ORDER.length]);
});
replayStudyButton.addEventListener("click", () => setLevel(levelKey));
shareButton.addEventListener("click", shareCurrentChallenge);
previousStudyButton.addEventListener("click", () => {
  const current = currentLevelIndex();
  if (current > 0) setLevel(LEVEL_ORDER[current - 1]);
});
followingStudyButton.addEventListener("click", () => {
  const current = currentLevelIndex();
  if (current < LEVEL_ORDER.length - 1) setLevel(LEVEL_ORDER[current + 1]);
});

new ResizeObserver(updateLayout).observe(stage);

// 语言切换：apply() 刷新静态文案，applyLevelText()/renderFieldLabel()/render() 刷新动态文案，
// status 用记录的 key 重新翻译。
mountLangSwitcher(document.querySelector("#lang-switcher"), () => {
  apply();
  applyLevelText();
  renderFieldLabel();
  status.textContent = t(currentStatusKey);
  render();
});

setLevel(levelKey);
apply();
