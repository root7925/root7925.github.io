/**
 * @module share-core
 * @contract
 *  输入: completedCount (number), titles [{threshold,title}], locationLike (Location), navigatorLike (Navigator)
 *  输出: 成就标题 / 挑战 URL / 挑战文案 / share 结果 ("shared"|"cancelled"|"copied"|"unavailable")
 *  不变式: challengeUrl 清除 hash+search 后只设单一 puzzle 参数；
 *          shareChallenge 取消时返回 "cancelled" 不显示成功；无 share API 时降级到 clipboard
 *  边界: titles 为空 → 默认 "Puzzle Solver"；无 navigator.share 且无 clipboard → "unavailable"
 *  公私: PUBLIC（可进 root7925.github.io）
 *  依赖: 无
 *  状态: stable
 */
export function achievementFor(completedCount, titles) {
  const ordered = [...titles].sort(
    (left, right) => left.threshold - right.threshold,
  );
  return ordered.reduce(
    (current, entry) =>
      completedCount >= entry.threshold ? entry.title : current,
    ordered[0]?.title ?? "Puzzle Solver",
  );
}

export function challengeUrl(locationLike, parameter, value) {
  const url = new URL(locationLike.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(parameter, String(value));
  return url.toString();
}

export function challengeText({
  achievement,
  gameName,
  puzzleLabel,
  detail,
}) {
  return [
    `${achievement} ✦`,
    `I completed ${puzzleLabel} in ${gameName}${detail ? ` — ${detail}` : ""}.`,
    "Can you solve the same one?",
  ].join("\n");
}

export function scoreUrl(locationLike) {
  const url = new URL(locationLike.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function scoreText({
  achievement,
  gameName,
  score,
  cleanCount,
}) {
  return [
    `${achievement} ✦`,
    `I scored ${Number(score).toLocaleString("en-US")} in ${gameName} with ${cleanCount} clean signal${cleanCount === 1 ? "" : "s"}.`,
    "Can you beat my signal?",
  ].join("\n");
}

export function runScoreText({
  achievement,
  gameName,
  score,
  detail,
  challenge = "Can you beat my run?",
}) {
  return [
    `${achievement} ✦`,
    `I scored ${Number(score).toLocaleString("en-US")} in ${gameName}${detail ? ` — ${detail}` : ""}.`,
    challenge,
  ].join("\n");
}

export async function shareChallenge({
  navigatorLike,
  title,
  text,
  url,
}) {
  if (typeof navigatorLike?.share === "function") {
    try {
      await navigatorLike.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // A rejected native share should still offer a clipboard path.
    }
  }
  if (typeof navigatorLike?.clipboard?.writeText === "function") {
    await navigatorLike.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  }
  return "unavailable";
}
