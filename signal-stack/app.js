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
} from "./game-core.js?v=917017c4c2bf";
import { drawPiece } from "./piece-deck.js?v=917017c4c2bf";
import {
  scoreText,
  scoreUrl,
  shareChallenge,
} from "../shared/share-core.js?v=917017c4c2bf";
import {
  createIdentity,
  fallbackDisplayName,
  NAME_LIMITS,
} from "../shared/identity-core.js?v=917017c4c2bf";

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
const submitLeaderboardButton = document.querySelector("#submit-leaderboard");
const rankStatus = document.querySelector("#rank-status");
const leaderboardTop = document.querySelector("#leaderboard-top");
const openLeaderboardButton = document.querySelector("#open-leaderboard");
const closeLeaderboardButton = document.querySelector("#close-leaderboard");
const leaderboardPanel = document.querySelector("#leaderboard-panel");
const panelRankStatus = document.querySelector("#panel-rank-status");
const panelLeaderboardTop = document.querySelector("#panel-leaderboard-top");

const identity = createIdentity();
const GAME_ID = "signal-stack";

/** 首次进入时提示起名（可跳过，跳过则用 fallback） */
function promptForDisplayNameIfNeeded() {
  if (identity.getDisplayName()) return;
  const input = window.prompt(
    `Pick a callsign for the global leaderboard (${NAME_LIMITS.min}-${NAME_LIMITS.max} chars). Skip to stay anonymous.`,
    "",
  );
  if (input === null) return; // 用户取消，保持匿名
  if (identity.setDisplayName(input)) return;
  // 输入无效（空或超长），用 fallback
  identity.setDisplayName(fallbackDisplayName(identity.ensurePlayerId()));
}

/** 渲染 top 列表到指定 ol 元素 */
function renderLeaderboard(listEl, top, myEntry) {
  const maxScore = top.length > 0 ? top[0].score : 1;
  const items = top.map((entry, index) => {
    const li = document.createElement("li");
    const isMe = myEntry && entry.playerId === myEntry.playerId;
    li.className = isMe ? "is-me" : "";
    const barWidth = Math.max(8, Math.round((entry.score / maxScore) * 100));
    li.innerHTML = `<span class="rank">${String(index + 1).padStart(2, "0")}</span>` +
      `<span class="name">${escapeHtml(entry.displayName)}</span>` +
      `<span class="score-wrap">` +
        `<span class="signal-bar"><span class="signal-bar-fill" style="width:${barWidth}%"></span></span>` +
        `<span class="score">${entry.score.toLocaleString("en-US")}</span>` +
      `</span>`;
    return li;
  });
  listEl.replaceChildren(...items);
  listEl.hidden = top.length === 0;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/** 拉取并展示排行榜到指定容器 */
async function loadLeaderboardToList(listEl, statusEl, showMyRank) {
  statusEl.hidden = false;
  statusEl.textContent = "SCANNING CHANNELS…";
  try {
    const data = await identity.fetchRank(GAME_ID, 10);
    const myEntry = data.myRank != null
      ? { playerId: identity.getPlayerId(), displayName: identity.getDisplayName() || fallbackDisplayName(identity.getPlayerId()), score: data.myScore }
      : null;
    renderLeaderboard(listEl, data.top, myEntry);
    if (showMyRank) {
      if (data.myRank != null) {
        statusEl.textContent = `RECEIVED · RANK ${data.myRank}/${data.total} · BEST ${data.myScore.toLocaleString("en-US")}`;
      } else {
        statusEl.textContent = `AWAITING TRANSMISSION · ${data.total} OPERATORS ON AIR`;
      }
    } else {
      statusEl.textContent = `${data.total} OPERATORS ON AIR`;
    }
  } catch (err) {
    statusEl.textContent = `SIGNAL LOST: ${err.message}`;
    listEl.hidden = true;
  }
}

/** game over 后点击「Send to leaderboard」 */
async function submitToLeaderboard() {
  submitLeaderboardButton.disabled = true;
  rankStatus.hidden = false;
  rankStatus.textContent = "TRANSMITTING…";
  try {
    const result = await identity.submitScore(GAME_ID, score);
    rankStatus.textContent = `TRANSMITTED · RANK ${result.rank}/${result.total} · TOP ${100 - result.percentile}%`;
    await loadLeaderboardToList(leaderboardTop, rankStatus, true);
  } catch (err) {
    rankStatus.textContent = `TRANSMISSION FAILED: ${err.message}`;
    submitLeaderboardButton.disabled = false;
  }
}

function openLeaderboardPanel() {
  leaderboardPanel.hidden = false;
  loadLeaderboardToList(panelLeaderboardTop, panelRankStatus, true);
}

function closeLeaderboardPanel() {
  leaderboardPanel.hidden = true;
}

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
  // 默认隐藏按钮，异步比对历史最高分后再决定是否显示
  submitLeaderboardButton.hidden = true;
  submitLeaderboardButton.disabled = false;
  rankStatus.hidden = true;
  leaderboardTop.hidden = true;
  setMessage("No piece fits. The receiver is resting.");
  render();
  checkIfRecordBroken();
}

/** 异步查当前排行榜最高分，决定是否显示「Send to leaderboard」按钮 */
async function checkIfRecordBroken() {
  if (score <= 0) return;
  try {
    const data = await identity.fetchRank(GAME_ID, 1);
    if (data.myScore == null) {
      // 首次上榜，显示按钮
      submitLeaderboardButton.hidden = false;
    } else if (score > data.myScore) {
      // 破纪录，显示按钮
      submitLeaderboardButton.hidden = false;
    } else {
      // 未破纪录，不显示按钮，提示历史最高
      rankStatus.hidden = false;
      rankStatus.textContent = `BEST ON FILE: ${data.myScore.toLocaleString("en-US")} · UNBROKEN`;
    }
  } catch {
    // 查询失败（离线/API 不可用），保守显示按钮让用户自行尝试
    submitLeaderboardButton.hidden = false;
  }
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

/** 找到屏幕坐标下的棋盘格子 */
function cellAtPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  return el ? el.closest("[data-x][data-y]") : null;
}

/** 更新 hover 预览到指定格子坐标 */
function updateHoverAt(x, y) {
  const piece = selectedPiece();
  const pointer = { x, y };
  hoverOrigin = piece ? placementOriginForTap(grid, piece.cells, pointer) : pointer;
  applyBoardPreview();
}

// 触屏拖拽状态：pointerdown 时记录起点，pointermove 跟随，pointerup 放置
let touchDrag = null;

boardRoot.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  const cell = event.target.closest("[data-x][data-y]");
  if (!cell) return;
  event.preventDefault();

  if (event.pointerType === "touch") {
    // 触屏：进入拖拽预览模式，不立即放置
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    touchDrag = { activePointerId: event.pointerId, moved: false };
    // 拖拽期间禁止页面滚动，避免 pointermove 被中断
    boardRoot.style.touchAction = "none";
    updateHoverAt(x, y);
    return;
  }
  // 桌面：立即放置（保留原行为）
  activateBoardCell(event);
});

boardRoot.addEventListener("pointermove", (event) => {
  if (!touchDrag || event.pointerId !== touchDrag.activePointerId) return;
  const cell = cellAtPoint(event.clientX, event.clientY);
  if (!cell) return;
  const x = Number(cell.dataset.x);
  const y = Number(cell.dataset.y);
  // 与当前 hoverOrigin 不同才更新，避免冗余重绘
  if (!hoverOrigin || hoverOrigin.x !== x || hoverOrigin.y !== y) {
    touchDrag.moved = true;
    updateHoverAt(x, y);
  }
});

function endTouchDrag() {
  if (!touchDrag) return;
  touchDrag = null;
  // 恢复 touch-action，允许页面滚动
  boardRoot.style.touchAction = "";
}

boardRoot.addEventListener("pointerup", (event) => {
  if (!touchDrag || event.pointerId !== touchDrag.activePointerId) return;
  const cell = cellAtPoint(event.clientX, event.clientY);
  endTouchDrag();
  if (cell) {
    placeSelected({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
  } else {
    // 抬起在棋盘外 → 取消放置，保留预览状态清空
    hoverOrigin = null;
    applyBoardPreview();
  }
});

boardRoot.addEventListener("pointercancel", () => {
  endTouchDrag();
  hoverOrigin = null;
  applyBoardPreview();
});

boardRoot.addEventListener("click", (event) => {
  if (event.detail === 0) activateBoardCell(event);
});
boardRoot.addEventListener("pointerover", (event) => {
  const cell = event.target.closest("[data-x][data-y]");
  if (!cell || event.pointerType === "touch") return;
  const pointer = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
  updateHoverAt(pointer.x, pointer.y);
});
boardRoot.addEventListener("pointerleave", () => {
  if (touchDrag) return; // 拖拽中不响应 leave（手指可能只是滑出边缘再滑回）
  hoverOrigin = null;
  applyBoardPreview();
});
rotateButton.addEventListener("click", rotateSelected);
newRunButton.addEventListener("click", startRun);
restartButton.addEventListener("click", startRun);
shareButton.addEventListener("click", shareRun);
submitLeaderboardButton.addEventListener("click", submitToLeaderboard);
openLeaderboardButton.addEventListener("click", openLeaderboardPanel);
closeLeaderboardButton.addEventListener("click", closeLeaderboardPanel);

// 首次进入时提示起名（不阻塞游戏，prompt 关闭后 startRun）
promptForDisplayNameIfNeeded();
startRun();
