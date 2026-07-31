/**
 * @module identity-core
 * @contract
 *  输入: storageLike (localStorage), fetchLike (fetch), options { apiBase }
 *  输出: identity 对象 { getPlayerId, ensurePlayerId, getDisplayName,
 *         setDisplayName, submitScore, fetchRank, hasIdentity }
 *  不变式: playerId 是 UUID v4，一旦生成持久化；displayName 长度 1~20
 *  边界: storage 不可用时降级到内存；fetch 不可用时 submitScore 抛错
 *  公私: PUBLIC（可进 public/shared/，前端使用）
 *  依赖: 无（纯 ES modules + fetch）
 *  状态: stable（P1.1）
 *
 * 设计说明:
 *  - 匿名优先：playerId 是 UUID，不暴露任何 PII
 *  - 跨设备同步留待 P1.2 OAuth 绑定（player:oauth:{sub} → playerId）
 *  - 主键统一 playerId，OAuth 是「升级绑定」而非「替代」
 */
const PLAYER_ID_KEY = "leslie-play:player-id:v1";
const DISPLAY_NAME_KEY = "leslie-play:display-name:v1";
const NAME_MAX = 20;
const NAME_MIN = 1;

/** UUID v4 生成（crypto.randomUUID 不可用时降级） */
function uuidv4() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // 降级实现（老浏览器）
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = Number(c) === 8 ? (r & 3) | 8 : r;
    return v.toString(16);
  });
}

/** 截断/校验 displayName，返回 null 表示无效 */
function sanitizeName(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, NAME_MAX);
  return trimmed.length >= NAME_MIN ? trimmed : null;
}

/**
 * 创建 identity 实例。
 * @param {object} opts
 * @param {Storage} [opts.storage] - 默认 localStorage
 * @param {typeof fetch} [opts.fetchLike] - 默认 fetch
 * @param {string} [opts.apiBase] - API 基路径，默认 ''（相对路径）
 */
export function createIdentity(opts = {}) {
  const storage = opts.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const fetchLike = opts.fetchLike ?? ((...a) => fetch(...a));
  const apiBase = opts.apiBase ?? "";

  // 内存降级（storage 不可用时）
  const mem = { playerId: null, displayName: null };

  function getPlayerId() {
    if (storage) {
      try {
        return storage.getItem(PLAYER_ID_KEY);
      } catch {
        // 降级
      }
    }
    return mem.playerId;
  }

  function ensurePlayerId() {
    let id = getPlayerId();
    if (!id) {
      id = uuidv4();
      if (storage) {
        try {
          storage.setItem(PLAYER_ID_KEY, id);
        } catch {
          mem.playerId = id;
        }
      } else {
        mem.playerId = id;
      }
    }
    return id;
  }

  function getDisplayName() {
    if (storage) {
      try {
        return storage.getItem(DISPLAY_NAME_KEY);
      } catch {
        // 降级
      }
    }
    return mem.displayName;
  }

  function setDisplayName(name) {
    const clean = sanitizeName(name);
    if (!clean) return false;
    if (storage) {
      try {
        storage.setItem(DISPLAY_NAME_KEY, clean);
      } catch {
        mem.displayName = clean;
      }
    } else {
      mem.displayName = clean;
    }
    return true;
  }

  function hasIdentity() {
    return Boolean(getPlayerId() && getDisplayName());
  }

  /**
   * 提交分数到全球排行。
   * @param {string} gameId - 'signal-stack' | 'pebble-choir'
   * @param {number} score - 非负整数
   * @returns {Promise<{rank, total, percentile, score, updated}>}
   */
  async function submitScore(gameId, score) {
    const playerId = ensurePlayerId();
    const displayName = getDisplayName() || undefined;
    const res = await fetchLike(`${apiBase}/api/submit-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, gameId, score, displayName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "HTTP_" + res.status }));
      throw new Error(err.error || "SUBMIT_FAILED");
    }
    return res.json();
  }

  /**
   * 查询排行榜。
   * @param {string} gameId
   * @param {number} [limit=10] - 1~50
   * @returns {Promise<{total, top: [{playerId, displayName, score}], myRank?, myScore?}>}
   */
  async function fetchRank(gameId, limit = 10) {
    const playerId = getPlayerId();
    const params = new URLSearchParams({ gameId, limit: String(limit) });
    if (playerId) params.set("playerId", playerId);
    const res = await fetchLike(`${apiBase}/api/get-rank?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "HTTP_" + res.status }));
      throw new Error(err.error || "FETCH_FAILED");
    }
    return res.json();
  }

  return {
    getPlayerId,
    ensurePlayerId,
    getDisplayName,
    setDisplayName,
    hasIdentity,
    submitScore,
    fetchRank,
  };
}

/** 兜名兜底：当玩家未设昵称时生成「Player-XXXX」 */
export function fallbackDisplayName(playerId) {
  if (!playerId) return "Player";
  return `Player-${playerId.slice(0, 4)}`;
}

export const NAME_LIMITS = Object.freeze({ min: NAME_MIN, max: NAME_MAX });
