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
