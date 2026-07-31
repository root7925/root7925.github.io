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
} from "./game-core.js?v=e7818979c2ab";
import { drawPiece } from "./piece-deck.js?v=e7818979c2ab";
import {
  scoreText,
  scoreUrl,
  shareChallenge,
  renderShareCard,
  shareCardImage,
} from "../shared/share-core.js?v=e7818979c2ab";
import {
  createIdentity,
  fallbackDisplayName,
  NAME_LIMITS,
} from "../shared/identity-core.js?v=e7818979c2ab";
import { createI18n, mountLangSwitcher } from "../shared/i18n.js?v=e7818979c2ab";
import { messages } from "./i18n-messages.js?v=e7818979c2ab";

const { t, apply, onLangChange } = createI18n(messages);

const ACHIEVEMENT_KEYS = {
  "First Transmission": "achievement.firstTransmission",
  "Clear Channel": "achievement.clearChannel",
  "Frequency Finder": "achievement.frequencyFinder",
  "Signal Keeper": "achievement.signalKeeper",
  "Master Receiver": "achievement.masterReceiver",
};
function tAchievement(title) {
  return t(ACHIEVEMENT_KEYS[title] ?? "achievement.firstTransmission");
}

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
const shareCardCanvas = document.querySelector("#share-card");
const shareCardWrap = document.querySelector(".share-card-wrap");
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
    t("prompt.callsign", NAME_LIMITS.min, NAME_LIMITS.max),
    "",
  );
  if (input === null) return; // 用户取消，保持匿名
  if (identity.setDisplayName(input)) return;
  // 输入无效（空或超长），用 fallback
  identity.setDisplayName(fallbackDisplayName(identity.ensurePlayerId()));
}

/** 排行榜状态文案的 i18n 缓存，语言切换时重新应用 */
let lastRankStatus = null;
let lastPanelRankStatus = null;
function setRankStatus(key, ...args) {
  lastRankStatus = { key, args };
  rankStatus.hidden = false;
  rankStatus.textContent = t(key, ...args);
}
function setPanelRankStatus(key, ...args) {
  lastPanelRankStatus = { key, args };
  panelRankStatus.hidden = false;
  panelRankStatus.textContent = t(key, ...args);
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
async function loadLeaderboardToList(listEl, statusSetter, showMyRank) {
  statusSetter("leaderboard.scanning");
  try {
    const data = await identity.fetchRank(GAME_ID, 10);
    const myEntry = data.myRank != null
      ? { playerId: identity.getPlayerId(), displayName: identity.getDisplayName() || fallbackDisplayName(identity.getPlayerId()), score: data.myScore }
      : null;
    renderLeaderboard(listEl, data.top, myEntry);
    if (showMyRank) {
      if (data.myRank != null) {
        statusSetter("leaderboard.received", data.myRank, data.total, data.myScore.toLocaleString("en-US"));
      } else {
        statusSetter("leaderboard.awaiting", data.total);
      }
    } else {
      statusSetter("leaderboard.operators", data.total);
    }
  } catch (err) {
    statusSetter("leaderboard.lost", err.message);
    listEl.hidden = true;
  }
}

/** game over 后点击「Send to leaderboard」 */
async function submitToLeaderboard() {
  submitLeaderboardButton.disabled = true;
  setRankStatus("leaderboard.transmitting");
  try {
    const result = await identity.submitScore(GAME_ID, score);
    setRankStatus("leaderboard.transmitted", result.rank, result.total, 100 - result.percentile);
    await loadLeaderboardToList(leaderboardTop, setRankStatus, true);
  } catch (err) {
    setRankStatus("leaderboard.failed", err.message);
    submitLeaderboardButton.disabled = false;
  }
}

function openLeaderboardPanel() {
  leaderboardPanel.hidden = false;
  loadLeaderboardToList(panelLeaderboardTop, setPanelRankStatus, true);
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

/** 动态提示文案走 i18n；缓存最近一条，语言切换时重新应用 */
let lastMessage = { key: "message.intro", args: [] };
function setMessageKey(key, ...args) {
  lastMessage = { key, args };
  setMessage(t(key, ...args));
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
  shareCardWrap.hidden = true;
  shareStatus.textContent = "";
  setMessageKey("message.intro");
  render();
}

/** 渲染 game over 面板里的分数、成就名与分享卡（语言切换时复用） */
function renderGameOverContent() {
  const title = achievementForScore(score);
  const localizedTitle = tAchievement(title);
  finalScoreRoot.textContent = score.toLocaleString("en-US");
  runTitleRoot.textContent = localizedTitle;
  renderShareCard(shareCardCanvas, {
    achievement: localizedTitle,
    gameName: "Signal Stack",
    detail: `${score.toLocaleString("en-US")} ${t("share.points")} · ${cleanThisRun} ${t(cleanThisRun === 1 ? "share.cleanSignal" : "share.cleanSignals")}`,
    accent: "#5ee6a0",
    background: "#090d09",
  });
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
  renderGameOverContent();
  shareCardWrap.hidden = false;
  gameOverRoot.hidden = false;
  // 默认隐藏按钮，异步比对历史最高分后再决定是否显示
  submitLeaderboardButton.hidden = true;
  submitLeaderboardButton.disabled = false;
  rankStatus.hidden = true;
  lastRankStatus = null;
  leaderboardTop.hidden = true;
  setMessageKey("message.noFit");
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
      setRankStatus("leaderboard.bestOnFile", data.myScore.toLocaleString("en-US"));
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
    setMessageKey("message.rotated");
  } else {
    setMessageKey("message.selected");
  }
  render();
}

function rotateSelected() {
  const piece = selectedPiece();
  if (!piece || !active) return;
  piece.cells = rotateCellsClockwise(piece.cells);
  hoverOrigin = null;
  setMessageKey("message.rotated");
  render();
}

function placeSelected(origin) {
  const piece = selectedPiece();
  if (!piece || !active) {
    setMessageKey("message.selectFirst");
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
    setMessageKey("message.blocked");
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
      ? t("flash.cleanSignals", result.cleanLineCount, combo)
      : t("flash.cleanSignal", combo);
    showFlash(label);
    setMessageKey("message.cleanMatched");
  } else if (lineCount > 0) {
    showFlash(lineCount === 1 ? t("flash.lineCleared", lineCount) : t("flash.linesCleared", lineCount));
    setMessageKey("message.spaceCleared");
  } else {
    setMessageKey("message.pieceLocked");
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
      clue.title = t("clue.column", target);
      return clue;
    }),
  );
  rowCluesRoot.replaceChildren(
    ...targets.rows.map((target) => {
      const clue = document.createElement("span");
      clue.textContent = target;
      clue.title = t("clue.row", target);
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
  const localizedTitle = tAchievement(title);
  const text = scoreText({
    achievement: localizedTitle,
    gameName: "Signal Stack",
    score,
    cleanCount: cleanThisRun,
  });
  const url = scoreUrl(location);
  const result = await shareCardImage({
    navigatorLike: navigator,
    canvas: shareCardCanvas,
    title: `Signal Stack — ${localizedTitle}`,
    text,
    url,
    fileName: "signal-stack-run.png",
  });
  if (result === "unavailable") {
    const fallback = await shareChallenge({
      navigatorLike: navigator,
      title: `Signal Stack — ${localizedTitle}`,
      text,
      url,
    });
    shareStatus.textContent =
      fallback === "shared"
        ? t("share.sent")
        : fallback === "copied"
          ? t("share.copiedLink")
          : fallback === "cancelled"
            ? ""
            : t("share.unavailable");
    return;
  }
  shareStatus.textContent =
    result === "shared"
      ? t("share.sentCard")
      : result === "copied"
        ? t("share.copied")
        : result === "downloaded"
          ? t("share.downloaded")
          : result === "cancelled"
            ? ""
            : t("share.unavailable");
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
submitLeaderboardButton.addEventListener("click", submitToLeaderboard);
openLeaderboardButton.addEventListener("click", openLeaderboardPanel);
closeLeaderboardButton.addEventListener("click", closeLeaderboardPanel);

// 初始化语言切换器 + 应用翻译 + 语言切换时刷新动态文案
mountLangSwitcher(document.querySelector("#lang-switcher"), () => {
  apply();
  setMessageKey(lastMessage.key, ...lastMessage.args);
  if (lastRankStatus) {
    rankStatus.hidden = false;
    rankStatus.textContent = t(lastRankStatus.key, ...lastRankStatus.args);
  }
  if (lastPanelRankStatus) {
    panelRankStatus.hidden = false;
    panelRankStatus.textContent = t(lastPanelRankStatus.key, ...lastPanelRankStatus.args);
  }
  render();
  if (!gameOverRoot.hidden) renderGameOverContent();
  if (!leaderboardPanel.hidden) {
    loadLeaderboardToList(panelLeaderboardTop, setPanelRankStatus, true);
  }
});

apply();

// 首次进入时提示起名（不阻塞游戏，prompt 关闭后 startRun）
promptForDisplayNameIfNeeded();
startRun();
