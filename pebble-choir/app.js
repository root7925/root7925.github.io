import {
  CHOIR_PHYSICS,
  PEBBLE_TIERS,
  choirAchievement,
  clampDropX,
  isPebbleSupported,
  mergeOutcome,
  safeChoirProgress,
  selectMergePairs,
  spawnTier,
  updateOverflowState,
} from "./game-core.js?v=b1eb2d47e860";
import { createFeedbackSystem } from "../shared/feedback-core.js?v=b1eb2d47e860";
import {
  renderShareCard,
  runScoreText,
  scoreUrl,
  shareCardImage,
  shareChallenge,
} from "../shared/share-core.js?v=b1eb2d47e860";
import {
  createIdentity,
  fallbackDisplayName,
  NAME_LIMITS,
} from "../shared/identity-core.js?v=b1eb2d47e860";
import { createI18n, mountLangSwitcher } from "../shared/i18n.js?v=b1eb2d47e860";
import { messages } from "./i18n-messages.js?v=b1eb2d47e860";

const {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Sleeping,
} = globalThis.Matter;

const { t, apply, onLangChange } = createI18n(messages);

const ACHIEVEMENT_KEYS = {
  "First Note": "achievement.firstNote",
  "Bell Maker": "achievement.bellMaker",
  "Harmony Finder": "achievement.harmonyFinder",
  "Resonance Keeper": "achievement.resonanceKeeper",
  "Full Choir": "achievement.fullChoir",
};
function localizeAchievement(title) {
  return t(ACHIEVEMENT_KEYS[title] ?? "achievement.firstNote");
}
function tierName(tier) {
  return t("tier." + PEBBLE_TIERS[tier].name);
}

const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 468;
const TOP_LINE = 82;
const DROP_Y = 52;
const STORAGE_KEY = "leslie-play:pebble-choir:v1";
const DROP_COOLDOWN_MS = 330;

const canvas = document.querySelector("#vessel");
const context = canvas.getContext("2d");
const scoreRoot = document.querySelector("#score");
const bestRoot = document.querySelector("#best");
const nextRoot = document.querySelector("#next-pebble");
const statusRoot = document.querySelector("#status");
const guideRoot = document.querySelector("#drop-guide");
const tierListRoot = document.querySelector("#tier-list");
const soundToggle = document.querySelector("#sound-toggle");
const newRunButton = document.querySelector("#new-run");
const gameOverDialog = document.querySelector("#game-over");
const achievementRoot = document.querySelector("#achievement");
const largestNameRoot = document.querySelector("#largest-name");
const finalScoreRoot = document.querySelector("#final-score");
const finalBestRoot = document.querySelector("#final-best");
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
const GAME_ID = "pebble-choir";

const feedback = createFeedbackSystem();
const engine = Engine.create({
  enableSleeping: CHOIR_PHYSICS.enableSleeping,
});
engine.gravity.y = 1.05;

let progress = loadProgress();
let score = 0;
let largestTier = 0;
let nextTier = 0;
let active = true;
let dropX = WORLD_WIDTH / 2;
let lastDropAt = -Infinity;
let lastFrameAt = performance.now();
let lastMergeAt = -Infinity;
let chain = 0;
let overflowSince = null;
let ripples = [];

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
    return safeChoirProgress(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"),
    );
  } catch {
    return safeChoirProgress({});
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // The game remains playable when local persistence is blocked.
  }
}

function formatScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, "0");
}

function addVessel() {
  Composite.add(engine.world, [
    Bodies.rectangle(-7, WORLD_HEIGHT / 2, 28, WORLD_HEIGHT, {
      isStatic: true,
      label: "wall",
      friction: 0,
      frictionStatic: 0,
    }),
    Bodies.rectangle(WORLD_WIDTH + 7, WORLD_HEIGHT / 2, 28, WORLD_HEIGHT, {
      isStatic: true,
      label: "wall",
      friction: 0,
      frictionStatic: 0,
    }),
    Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT + 7, WORLD_WIDTH, 28, {
      isStatic: true,
      label: "floor",
      friction: 0.12,
    }),
  ]);
}

function createPebble(tier, x, y, createdAt = performance.now()) {
  const definition = PEBBLE_TIERS[tier];
  const body = Bodies.circle(x, y, definition.radius, {
    label: "pebble",
    restitution: 0.08,
    friction: 0.075,
    frictionStatic: 0.12,
    frictionAir: 0.004,
    density: 0.0014,
    slop: 0.02,
  });
  body.plugin.pebble = { tier, createdAt };
  return body;
}

function bodyModel(body) {
  return {
    id: body.id,
    tier: body.plugin.pebble.tier,
    createdAt: body.plugin.pebble.createdAt,
    x: body.position.x,
    y: body.position.y,
    velocity: body.velocity,
  };
}

function pebbleBodies() {
  return Composite.allBodies(engine.world).filter(
    (body) => body.label === "pebble",
  );
}

function dropPebble(x) {
  if (!active) return;
  const now = performance.now();
  if (now - lastDropAt < DROP_COOLDOWN_MS) {
    statusRoot.textContent = t("status.settle");
    return;
  }
  const safeX = clampDropX(x, nextTier, WORLD_WIDTH);
  Composite.add(engine.world, createPebble(nextTier, safeX, DROP_Y, now));
  largestTier = Math.max(largestTier, nextTier);
  lastDropAt = now;
  feedback.playTone({
    frequency: PEBBLE_TIERS[nextTier].frequency,
    duration: 0.1,
    gain: 0.14,
    type: "triangle",
  });
  nextTier = spawnTier(randomUnit);
  statusRoot.textContent = t("status.matchVoices");
  renderHud();
}

function mergeBodies(firstBody, secondBody, now) {
  if (!Composite.get(engine.world, firstBody.id, "body")) return;
  if (!Composite.get(engine.world, secondBody.id, "body")) return;

  chain = now - lastMergeAt <= 720 ? chain + 1 : 0;
  lastMergeAt = now;
  const outcome = mergeOutcome(
    bodyModel(firstBody),
    bodyModel(secondBody),
    chain,
  );
  if (!outcome) return;

  Composite.remove(engine.world, firstBody);
  Composite.remove(engine.world, secondBody);
  const merged = createPebble(outcome.tier, outcome.x, outcome.y, now);
  Body.setVelocity(merged, outcome.velocity);
  Composite.add(engine.world, merged);

  score += outcome.points;
  largestTier = Math.max(largestTier, outcome.tier);
  ripples.push({
    x: outcome.x,
    y: outcome.y,
    radius: PEBBLE_TIERS[outcome.tier].radius,
    bornAt: now,
  });
  const harmony =
    chain >= 2 ? [1.25, 1.5] : chain >= 1 || outcome.tier >= 5 ? [1.5] : [];
  feedback.playTone({
    frequency: PEBBLE_TIERS[outcome.tier].frequency,
    duration: 0.22,
    gain: 0.2,
    harmony,
  });
  if (chain >= 2) feedback.vibrate(12);
  statusRoot.textContent =
    chain >= 2
      ? t("status.harmony", chain + 1)
      : t("status.joined", tierName(outcome.tier));
  renderHud();
}

Events.on(engine, "collisionStart", ({ pairs }) => {
  const collisions = pairs
    .filter(
      ({ bodyA, bodyB }) =>
        bodyA.label === "pebble" && bodyB.label === "pebble",
    )
    .map(({ bodyA, bodyB }) => ({
      first: bodyModel(bodyA),
      second: bodyModel(bodyB),
      firstBody: bodyA,
      secondBody: bodyB,
    }));
  const now = performance.now();
  for (const collision of selectMergePairs(collisions)) {
    mergeBodies(collision.firstBody, collision.secondBody, now);
  }
});

function renderHud() {
  scoreRoot.textContent = formatScore(score);
  bestRoot.textContent = formatScore(Math.max(progress.best, score));
  const definition = PEBBLE_TIERS[nextTier];
  nextRoot.style.setProperty("--pebble-color", definition.color);
  nextRoot.style.setProperty("--pebble-size", `${20 + nextTier * 4}px`);
  nextRoot.title = tierName(nextTier);
}

function renderTierList() {
  tierListRoot.replaceChildren(
    ...PEBBLE_TIERS.map((tier, index) => {
      const item = document.createElement("span");
      item.style.setProperty("--tier-color", tier.color);
      item.classList.toggle("is-reached", index <= progress.largestTier);
      item.innerHTML = `<i aria-hidden="true"></i><b>${tierName(index)}</b>`;
      return item;
    }),
  );
}

function updateSoundToggle() {
  soundToggle.textContent = t(feedback.enabled ? "nav.soundOn" : "nav.soundOff");
  soundToggle.setAttribute("aria-pressed", String(feedback.enabled));
}

function resetRun() {
  for (const body of pebbleBodies()) Composite.remove(engine.world, body);
  score = 0;
  largestTier = 0;
  nextTier = spawnTier(randomUnit);
  active = true;
  chain = 0;
  overflowSince = null;
  ripples = [];
  lastDropAt = -Infinity;
  shareStatus.textContent = "";
  if (gameOverDialog.open) gameOverDialog.close();
  statusRoot.textContent = t("status.dropFirst");
  renderHud();
}

function finishRun() {
  if (!active) return;
  active = false;
  progress = {
    best: Math.max(progress.best, score),
    runs: progress.runs + 1,
    largestTier: Math.max(progress.largestTier, largestTier),
  };
  saveProgress();
  renderTierList();
  const title = choirAchievement(score, largestTier);
  achievementRoot.textContent = localizeAchievement(title);
  largestNameRoot.textContent = tierName(largestTier);
  finalScoreRoot.textContent = score.toLocaleString("en-US");
  finalBestRoot.textContent = progress.best.toLocaleString("en-US");
  feedback.play("complete");
  feedback.vibrate([18, 30, 24]);
  // 默认隐藏按钮，异步比对历史最高分后再决定是否显示
  submitLeaderboardButton.hidden = true;
  submitLeaderboardButton.disabled = false;
  rankStatus.hidden = true;
  leaderboardTop.hidden = true;
  renderShareCard(shareCardCanvas, {
    achievement: localizeAchievement(title),
    gameName: "Pebble Choir",
    detail: score.toLocaleString("en-US"),
    accent: "#f2c14e",
    background: "#151319",
  });
  shareCardWrap.hidden = false;
  gameOverDialog.showModal();
  checkIfRecordBroken();
}

/** 首次进入时提示起名（可跳过，跳过则用 fallback） */
function promptForDisplayNameIfNeeded() {
  if (identity.getDisplayName()) return;
  const input = window.prompt(
    t("identity.prompt", NAME_LIMITS.min, NAME_LIMITS.max),
    "",
  );
  if (input === null) return;
  if (identity.setDisplayName(input)) return;
  identity.setDisplayName(fallbackDisplayName(identity.ensurePlayerId()));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
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

/** 拉取并展示排行榜到指定容器 */
async function loadLeaderboardToList(listEl, statusEl, showMyRank) {
  statusEl.hidden = false;
  statusEl.textContent = t("leaderboard.tuning");
  try {
    const data = await identity.fetchRank(GAME_ID, 10);
    const myEntry = data.myRank != null
      ? { playerId: identity.getPlayerId(), displayName: identity.getDisplayName() || fallbackDisplayName(identity.getPlayerId()), score: data.myScore }
      : null;
    renderLeaderboard(listEl, data.top, myEntry);
    if (showMyRank) {
      if (data.myRank != null) {
        statusEl.textContent = t("leaderboard.received", data.myRank, data.total, data.myScore.toLocaleString("en-US"));
      } else {
        statusEl.textContent = t("leaderboard.awaiting", data.total);
      }
    } else {
      statusEl.textContent = t("leaderboard.onAir", data.total);
    }
  } catch (err) {
    statusEl.textContent = t("leaderboard.signalLost", err.message);
    listEl.hidden = true;
  }
}

/** game over 后点击「Send to leaderboard」 */
async function submitToLeaderboard() {
  submitLeaderboardButton.disabled = true;
  rankStatus.hidden = false;
  rankStatus.textContent = t("leaderboard.transmitting");
  try {
    const result = await identity.submitScore(GAME_ID, score);
    rankStatus.textContent = t("leaderboard.transmitted", result.rank, result.total, 100 - result.percentile);
    await loadLeaderboardToList(leaderboardTop, rankStatus, true);
  } catch (err) {
    rankStatus.textContent = t("leaderboard.transmissionFailed", err.message);
    submitLeaderboardButton.disabled = false;
  }
}

/** 异步查当前排行榜最高分，决定是否显示「Send to leaderboard」按钮 */
async function checkIfRecordBroken() {
  if (score <= 0) return;
  try {
    const data = await identity.fetchRank(GAME_ID, 1);
    if (data.myScore == null) {
      submitLeaderboardButton.hidden = false;
    } else if (score > data.myScore) {
      submitLeaderboardButton.hidden = false;
    } else {
      rankStatus.hidden = false;
      rankStatus.textContent = t("leaderboard.bestOnFile", data.myScore.toLocaleString("en-US"));
    }
  } catch {
    submitLeaderboardButton.hidden = false;
  }
}

function openLeaderboardPanel() {
  leaderboardPanel.hidden = false;
  loadLeaderboardToList(panelLeaderboardTop, panelRankStatus, true);
}

function closeLeaderboardPanel() {
  leaderboardPanel.hidden = true;
}

/** 语言切换后重新渲染所有动态文案 */
function renderDynamicText() {
  apply();
  updateSoundToggle();
  renderTierList();
  renderHud();
  if (gameOverDialog.open) {
    const title = choirAchievement(score, largestTier);
    achievementRoot.textContent = localizeAchievement(title);
    largestNameRoot.textContent = tierName(largestTier);
    finalScoreRoot.textContent = score.toLocaleString("en-US");
    finalBestRoot.textContent = progress.best.toLocaleString("en-US");
    renderShareCard(shareCardCanvas, {
      achievement: localizeAchievement(title),
      gameName: "Pebble Choir",
      detail: score.toLocaleString("en-US"),
      accent: "#f2c14e",
      background: "#151319",
    });
  }
  if (active) {
    statusRoot.textContent = pebbleBodies().length > 0
      ? t("status.matchVoices")
      : t("status.dropFirst");
  }
}

async function shareRun() {
  const title = choirAchievement(score, largestTier);
  const text = runScoreText({
    achievement: localizeAchievement(title),
    gameName: "Pebble Choir",
    score,
    detail: t("share.detail", tierName(largestTier)),
  });
  const url = scoreUrl(location);
  const result = await shareCardImage({
    navigatorLike: navigator,
    canvas: shareCardCanvas,
    title: "Pebble Choir score",
    text,
    url,
    fileName: "pebble-choir-score.png",
  });
  if (result === "unavailable") {
    const fallback = await shareChallenge({
      navigatorLike: navigator,
      title: "Pebble Choir score",
      text,
      url,
    });
    shareStatus.textContent =
      fallback === "shared"
        ? t("share.scoreSent")
        : fallback === "copied"
          ? t("share.scoreCopied")
          : fallback === "cancelled"
            ? ""
            : t("share.unavailable");
    return;
  }
  shareStatus.textContent =
    result === "shared"
      ? t("share.cardSent")
      : result === "copied"
        ? t("share.cardCopied")
        : result === "downloaded"
          ? t("share.cardDownloaded")
          : result === "cancelled"
            ? ""
            : t("share.unavailable");
}

function resizeCanvas() {
  const width = canvas.clientWidth || 360;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(width * (WORLD_HEIGHT / WORLD_WIDTH) * ratio);
}

function drawPebble(body) {
  const { tier } = body.plugin.pebble;
  const definition = PEBBLE_TIERS[tier];
  const { x, y } = body.position;
  const radius = definition.radius;

  context.save();
  context.translate(x, y);
  context.rotate(body.angle);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fillStyle = definition.color;
  context.shadowColor = `${definition.color}88`;
  context.shadowBlur = tier >= 4 ? 18 : 8;
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 2;
  context.strokeStyle = "#201c23";
  context.stroke();

  context.beginPath();
  context.arc(-radius * 0.22, -radius * 0.24, radius * 0.45, Math.PI, Math.PI * 1.65);
  context.strokeStyle = "rgba(255,255,255,.42)";
  context.lineWidth = Math.max(1.5, radius * 0.065);
  context.lineCap = "round";
  context.stroke();

  if (tier >= 2) {
    context.fillStyle = "rgba(30,25,34,.65)";
    context.font = `600 ${Math.max(11, radius * 0.38)}px ui-rounded, system-ui`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(tier >= 5 ? "♪" : "·", 0, 1);
  }
  context.restore();
}

function drawScene(now) {
  const scale = canvas.width / WORLD_WIDTH;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, "#211b28");
  gradient.addColorStop(1, "#121116");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  context.setLineDash([5, 7]);
  context.strokeStyle = "rgba(242,217,133,.26)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(10, TOP_LINE);
  context.lineTo(WORLD_WIDTH - 10, TOP_LINE);
  context.stroke();
  context.setLineDash([]);

  for (const body of pebbleBodies()) drawPebble(body);

  ripples = ripples.filter((ripple) => now - ripple.bornAt < 520);
  for (const ripple of ripples) {
    const life = (now - ripple.bornAt) / 520;
    context.beginPath();
    context.arc(
      ripple.x,
      ripple.y,
      ripple.radius * (0.7 + life * 1.2),
      0,
      Math.PI * 2,
    );
    context.strokeStyle = `rgba(255,245,190,${0.6 * (1 - life)})`;
    context.lineWidth = 2;
    context.stroke();
  }

  if (active) {
    const definition = PEBBLE_TIERS[nextTier];
    context.beginPath();
    context.arc(
      clampDropX(dropX, nextTier, WORLD_WIDTH),
      DROP_Y,
      definition.radius,
      0,
      Math.PI * 2,
    );
    context.fillStyle = `${definition.color}55`;
    context.fill();
    context.strokeStyle = `${definition.color}cc`;
    context.lineWidth = 1.5;
    context.stroke();
  }
}

function checkOverflow(now) {
  const next = updateOverflowState({
    pebbles: pebbleBodies().map(bodyModel),
    topLine: TOP_LINE,
    now,
    previousSince: overflowSince,
  });
  overflowSince = next.since;
  canvas.classList.toggle("is-warning", overflowSince !== null);
  if (next.ended) finishRun();
}

function enforceSupportInvariant() {
  const bodies = pebbleBodies();
  const models = bodies.map(bodyModel);
  for (const body of bodies) {
    if (
      body.isSleeping &&
      !isPebbleSupported({
        pebble: bodyModel(body),
        pebbles: models,
        worldHeight: WORLD_HEIGHT,
      })
    ) {
      Sleeping.set(body, false);
      Body.setVelocity(body, {
        x: body.velocity.x * 0.5,
        y: Math.max(0.45, body.velocity.y),
      });
    }
  }
}

function frame(now) {
  const delta = Math.min(1000 / 60, Math.max(8, now - lastFrameAt));
  lastFrameAt = now;
  Engine.update(engine, delta);
  enforceSupportInvariant();
  applyMagneticMerge(now);
  if (active) checkOverflow(now);
  drawScene(now);
  requestAnimationFrame(frame);
}

// 磁吸容差：每帧检查同阶球之间的距离，若小于半径和+容差就主动合并。
// 弥补 Matter.js 碰撞事件在亚像素间隙时不触发的体验问题。
const MAGNETIC_TOLERANCE = 4;
let lastMagneticAt = 0;
function applyMagneticMerge(now) {
  if (now - lastMagneticAt < 50) return;
  lastMagneticAt = now;

  const bodies = pebbleBodies();
  const used = new Set();
  for (let i = 0; i < bodies.length; i += 1) {
    if (used.has(bodies[i].id)) continue;
    for (let j = i + 1; j < bodies.length; j += 1) {
      if (used.has(bodies[j].id)) continue;
      const a = bodies[i];
      const b = bodies[j];
      if (a.plugin.pebble.tier !== b.plugin.pebble.tier) continue;
      if (a.plugin.pebble.tier >= PEBBLE_TIERS.length - 1) continue;

      const radiusA = PEBBLE_TIERS[a.plugin.pebble.tier].radius;
      const radiusB = PEBBLE_TIERS[b.plugin.pebble.tier].radius;
      const dist = Math.hypot(
        a.position.x - b.position.x,
        a.position.y - b.position.y,
      );
      if (dist <= radiusA + radiusB + MAGNETIC_TOLERANCE) {
        mergeBodies(a, b, now);
        used.add(a.id);
        used.add(b.id);
        break;
      }
    }
  }
}

function pointerWorldX(event) {
  const bounds = canvas.getBoundingClientRect();
  return ((event.clientX - bounds.left) / bounds.width) * WORLD_WIDTH;
}

canvas.addEventListener("pointermove", (event) => {
  dropX = pointerWorldX(event);
  const bounds = canvas.getBoundingClientRect();
  guideRoot.style.left = `${event.clientX - bounds.left}px`;
});
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dropX = pointerWorldX(event);
  dropPebble(dropX);
});
canvas.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  dropPebble(dropX);
});
soundToggle.addEventListener("click", () => {
  const enabled = feedback.toggle();
  updateSoundToggle();
  if (enabled) feedback.playTone({ frequency: 523.25, duration: 0.1 });
});
newRunButton.addEventListener("click", resetRun);
restartButton.addEventListener("click", resetRun);
shareButton.addEventListener("click", shareRun);
submitLeaderboardButton.addEventListener("click", submitToLeaderboard);
openLeaderboardButton.addEventListener("click", openLeaderboardPanel);
closeLeaderboardButton.addEventListener("click", closeLeaderboardPanel);

promptForDisplayNameIfNeeded();
window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  lastFrameAt = performance.now();
});

// 初始化语言切换器 + 应用保存的语言 + 语言切换时重新渲染动态文案
mountLangSwitcher(document.querySelector("#lang-switcher"));
onLangChange(renderDynamicText);

addVessel();
resizeCanvas();
apply();
renderTierList();
updateSoundToggle();
resetRun();
requestAnimationFrame(frame);
