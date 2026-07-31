import { LANTERN_GROVE_COLLECTION } from "./collection-01.js?v=25966cd64e4c";
import {
  CELL_LANTERN,
  CELL_MARK,
  applyCellAction,
  computeBoardSize,
  createGameState,
  getConflicts,
  getRuleProgress,
  isPuzzleSolved,
  regionEdges,
} from "./game-core.js?v=25966cd64e4c";
import {
  achievementFor,
  challengeText,
  challengeUrl,
  shareChallenge,
  renderShareCard,
  shareCardImage,
} from "../shared/share-core.js?v=25966cd64e4c";
import { createFeedbackSystem } from "../shared/feedback-core.js?v=25966cd64e4c";
import { createI18n, mountLangSwitcher, getLang } from "../shared/i18n.js?v=25966cd64e4c";
import { messages } from "./i18n-messages.js?v=25966cd64e4c";

const { t, apply, onLangChange } = createI18n(messages);

const STORAGE_KEY = "leslie-play:lantern-grove:v1";
const palette = [
  "#f6d365",
  "#9ed8c3",
  "#aabcf5",
  "#d4aceb",
  "#f2aa8f",
  "#b8d786",
  "#efb8cd",
  "#8fd1de",
];

const board = document.querySelector("#board");
const levelLabel = document.querySelector("#level-label");
const difficultyLabel = document.querySelector("#difficulty-label");
const progressLabel = document.querySelector("#progress-label");
const ruleStatus = document.querySelector("#rule-status");
const levelPicker = document.querySelector("#level-picker");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const restartButton = document.querySelector("#restart");
const undoButton = document.querySelector("#undo");
const helpButton = document.querySelector("#help");
const helpDialog = document.querySelector("#help-dialog");
const winDialog = document.querySelector("#win-dialog");
const winTitle = document.querySelector("#win-title");
const winCopy = document.querySelector("#win-copy");
const nextButton = document.querySelector("#next-level");
const closeWinButton = document.querySelector("#close-win");
const shareButton = document.querySelector("#share-challenge");
const shareStatus = document.querySelector("#share-status");
const shareCardCanvas = document.querySelector("#share-card");
const shareCardWrap = document.querySelector(".share-card-wrap");
const soundToggle = document.querySelector("#sound-toggle");
const feedback = createFeedbackSystem();

let activeIndex = 0;
let mode = "lantern";
let state = createGameState(LANTERN_GROVE_COLLECTION[0]);
let history = [];
let completed = new Set();
let startedAt = Date.now();
let completionTimer = null;
let lastElapsedSeconds = 1;
const GROVE_TITLES = [
  { threshold: 1, title: "Grove Keeper" },
  { threshold: 4, title: "Dawn Keeper" },
  { threshold: 8, title: "Lantern Pathfinder" },
  { threshold: 12, title: "Garden Cartographer" },
  { threshold: 16, title: "Keeper of Sixteen" },
];

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    completed = new Set(saved.completed || []);
    activeIndex = Math.min(
      Math.max(Number(saved.activeIndex) || 0, 0),
      LANTERN_GROVE_COLLECTION.length - 1,
    );
  } catch {
    completed = new Set();
    activeIndex = 0;
  }
}

function saveProgress() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activeIndex,
      completed: [...completed],
    }),
  );
}

function renderLevelPicker() {
  levelPicker.replaceChildren(
    ...LANTERN_GROVE_COLLECTION.map((puzzle, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1).padStart(2, "0");
      button.className = "level-chip";
      button.classList.toggle("is-active", index === activeIndex);
      button.classList.toggle("is-complete", completed.has(puzzle.id));
      button.setAttribute(
        "aria-label",
        `Puzzle ${index + 1}${completed.has(puzzle.id) ? ", completed" : ""}`,
      );
      button.addEventListener("click", () => openLevel(index));
      return button;
    }),
  );
}

function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateSoundToggle() {
  soundToggle.textContent = t(feedback.enabled ? "nav.soundOn" : "nav.soundOff");
  soundToggle.setAttribute("aria-pressed", String(feedback.enabled));
}

function renderBoard({ actionIndex = -1, progressPulse = false } = {}) {
  const puzzle = state.puzzle;
  const conflicts = getConflicts(state);
  const metrics = computeBoardSize(window.innerWidth, puzzle.size);
  board.style.setProperty("--grid-size", puzzle.size);
  board.style.setProperty("--board-size", `${metrics.board}px`);
  board.style.setProperty("--cell-size", `${metrics.cell}px`);
  board.setAttribute(
    "aria-label",
    `${puzzle.size} by ${puzzle.size} Lantern Grove puzzle`,
  );
  board.classList.toggle("is-progress", progressPulse);

  board.replaceChildren(
    ...state.cells.map((value, index) => {
      const cell = document.createElement("button");
      const edges = regionEdges(puzzle, index);
      cell.type = "button";
      cell.className = "cell";
      cell.style.setProperty(
        "--region-color",
        palette[puzzle.regions[index] % palette.length],
      );
      for (const [edge, visible] of Object.entries(edges)) {
        cell.classList.toggle(`edge-${edge}`, visible);
      }
      cell.classList.toggle("is-lantern", value === CELL_LANTERN);
      cell.classList.toggle(
        "is-new-lantern",
        value === CELL_LANTERN && index === actionIndex,
      );
      cell.classList.toggle("is-mark", value === CELL_MARK);
      cell.classList.toggle("is-conflict", conflicts.has(index));
      cell.setAttribute(
        "aria-label",
        `Row ${Math.floor(index / puzzle.size) + 1}, column ${
          (index % puzzle.size) + 1
        }${value === CELL_LANTERN ? ", lantern" : value === CELL_MARK ? ", marked empty" : ""}`,
      );
      cell.innerHTML =
        value === CELL_LANTERN
          ? '<span class="lantern" aria-hidden="true"><i></i></span>'
          : value === CELL_MARK
            ? '<span class="mark" aria-hidden="true">×</span>'
            : "";
      cell.addEventListener("click", () => handleCell(index));
      return cell;
    }),
  );

  const progress = getRuleProgress(state);
  progressLabel.textContent = t(
    "meta.progress",
    progress.lanterns,
    progress.target,
    progress.rows,
    progress.columns,
    progress.regions,
  );
  undoButton.disabled = history.length === 0;
}

function render() {
  const puzzle = state.puzzle;
  levelLabel.textContent = t("meta.groveLabel", String(activeIndex + 1).padStart(2, "0"));
  difficultyLabel.textContent = `${t("difficulty." + puzzle.difficulty)} · ${puzzle.size}×${puzzle.size}`;
  renderLevelPicker();
  renderBoard();
}

function handleCell(index) {
  const before = getRuleProgress(state);
  history.push([...state.cells]);
  state = applyCellAction(state, index, mode);
  const after = getRuleProgress(state);
  const conflicts = getConflicts(state);
  const progressPulse =
    after.rows > before.rows ||
    after.columns > before.columns ||
    after.regions > before.regions;
  renderBoard({ actionIndex: index, progressPulse });
  ruleStatus.classList.toggle("is-error", conflicts.size > 0);
  if (conflicts.size > 0) {
    feedback.play("conflict");
    feedback.vibrate(18);
    ruleStatus.textContent = t("rule.status.conflict");
  } else if (state.cells[index] === CELL_LANTERN) {
    feedback.play(progressPulse ? "progress" : "place");
    ruleStatus.textContent = t("rule.status.good");
  } else if (state.cells[index] === CELL_MARK) {
    feedback.play("mark");
    ruleStatus.textContent = t("rule.status.marked");
  } else {
    feedback.play("clear");
    ruleStatus.textContent = t("rule.status.cleared");
  }
  if (isPuzzleSolved(state)) completePuzzle();
}

function completePuzzle() {
  completed.add(state.puzzle.id);
  saveProgress();
  renderLevelPicker();
  lastElapsedSeconds = Math.max(
    1,
    Math.round((Date.now() - startedAt) / 1000),
  );
  winTitle.textContent = t("win.title");
  winCopy.textContent = t(
    "win.copy",
    String(activeIndex + 1).padStart(2, "0"),
    state.moves,
    lastElapsedSeconds,
  );
  const achievement = achievementFor(completed.size, GROVE_TITLES);
  document.querySelector("#achievement-title").textContent = achievement;
  renderShareCard(shareCardCanvas, {
    achievement,
    gameName: "Lantern Grove",
    puzzleLabel: `Grove ${String(activeIndex + 1).padStart(2, "0")}`,
    detail: `${state.moves} moves · ${lastElapsedSeconds}s`,
    accent: "#f6d365",
    background: "#17251d",
  });
  shareCardWrap.hidden = false;
  shareStatus.textContent = "";
  nextButton.hidden = activeIndex >= LANTERN_GROVE_COLLECTION.length - 1;
  board.classList.add("is-solved");
  feedback.play("complete");
  feedback.vibrate([18, 35, 24]);
  clearTimeout(completionTimer);
  completionTimer = setTimeout(
    () => winDialog.showModal(),
    feedback.reducedMotion ? 0 : 720,
  );
}

async function shareCurrentChallenge() {
  const achievement = achievementFor(completed.size, GROVE_TITLES);
  const puzzleNumber = activeIndex + 1;
  const puzzleLabel = `Grove ${String(puzzleNumber).padStart(2, "0")}`;
  const detail = `${state.moves} moves · ${lastElapsedSeconds}s`;
  const text = challengeText({
    achievement,
    gameName: "Lantern Grove",
    puzzleLabel,
    detail,
  });
  const url = challengeUrl(location, "g", puzzleNumber);
  const result = await shareCardImage({
    navigatorLike: navigator,
    canvas: shareCardCanvas,
    title: "Lantern Grove challenge",
    text,
    url,
    fileName: `lantern-grove-grove-${puzzleNumber}.png`,
  });
  if (result === "unavailable") {
    const fallback = await shareChallenge({
      navigatorLike: navigator,
      title: "Lantern Grove challenge",
      text,
      url,
    });
    shareStatus.textContent =
      fallback === "shared"
        ? t("share.sent")
        : fallback === "copied"
          ? t("share.copied")
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

function openLevel(index) {
  clearTimeout(completionTimer);
  activeIndex = index;
  state = createGameState(LANTERN_GROVE_COLLECTION[index]);
  history = [];
  startedAt = Date.now();
  ruleStatus.classList.remove("is-error");
  ruleStatus.textContent = t("rule.status.first");
  saveProgress();
  render();
  winDialog.close();
}

modeButtons.forEach((button) =>
  button.addEventListener("click", () => setMode(button.dataset.mode)),
);

restartButton.addEventListener("click", () => {
  clearTimeout(completionTimer);
  state = createGameState(state.puzzle);
  history = [];
  startedAt = Date.now();
  ruleStatus.classList.remove("is-error");
  ruleStatus.textContent = t("rule.status.first");
  renderBoard();
});

undoButton.addEventListener("click", () => {
  const previous = history.pop();
  if (!previous) return;
  state = { ...state, cells: previous, moves: Math.max(0, state.moves - 1) };
  renderBoard();
});

helpButton.addEventListener("click", () => helpDialog.showModal());
helpDialog
  .querySelector("[data-close]")
  .addEventListener("click", () => helpDialog.close());
closeWinButton.addEventListener("click", () => winDialog.close());
nextButton.addEventListener("click", () => openLevel(activeIndex + 1));
shareButton.addEventListener("click", shareCurrentChallenge);
soundToggle.addEventListener("click", () => {
  const enabled = feedback.toggle();
  updateSoundToggle();
  if (enabled) feedback.play("place");
});
window.addEventListener("resize", renderBoard);

// 初始化语言切换器 + 应用翻译 + 语言切换时刷新动态文案
mountLangSwitcher(document.querySelector("#lang-switcher"), () => {
  apply();
  updateSoundToggle();
  render();
  // 如果 win dialog 打开，刷新 win 文案
  if (winDialog.open && isPuzzleSolved(state)) {
    winTitle.textContent = t("win.title");
    winCopy.textContent = t(
      "win.copy",
      String(activeIndex + 1).padStart(2, "0"),
      state.moves,
      lastElapsedSeconds,
    );
  }
});

loadProgress();
updateSoundToggle();
const requestedGrove = Number(new URLSearchParams(location.search).get("g"));
if (
  Number.isInteger(requestedGrove) &&
  requestedGrove >= 1 &&
  requestedGrove <= LANTERN_GROVE_COLLECTION.length
) {
  activeIndex = requestedGrove - 1;
}
openLevel(activeIndex);
