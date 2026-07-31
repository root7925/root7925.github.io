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

// --- Share card (visual achievement image) ---
// 1200x630 canvas, theme-color driven, no illustration dependency.
// 公私: PUBLIC

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const mix = (v) =>
    amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
  return `rgb(${clamp(mix(r))}, ${clamp(mix(g))}, ${clamp(mix(b))})`;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text).split(/\s+/);
  let line = "";
  let lineCount = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = word;
      lineCount += 1;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

/**
 * Render an achievement share card onto a canvas (internal 1200x630).
 * Theme-color driven; each game passes its own accent/background.
 */
export function renderShareCard(canvas, {
  achievement,
  gameName,
  puzzleLabel = "",
  detail = "",
  brand = "LESLIE·PLAY",
  accent = "#f6d365",
  background = "#17251d",
}) {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, background);
  grad.addColorStop(1, shade(background, -0.2));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Decorative orbs (corner accents, low alpha)
  ctx.fillStyle = withAlpha(accent, 0.1);
  ctx.beginPath();
  ctx.arc(W - 100, 110, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, H - 120, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha(accent, 0.06);
  ctx.beginPath();
  ctx.arc(W - 220, H - 80, 90, 0, Math.PI * 2);
  ctx.fill();

  // Hairline divider
  ctx.strokeStyle = withAlpha(accent, 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 130);
  ctx.lineTo(W - 60, 130);
  ctx.stroke();

  // Brand mark (top-left)
  ctx.fillStyle = withAlpha(accent, 0.92);
  ctx.font = "600 24px ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${brand}  ✦`, 60, 92);

  // Eyebrow
  ctx.fillStyle = withAlpha("#ffffff", 0.55);
  ctx.font = "500 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("ACHIEVEMENT UNLOCKED", 60, 180);

  // Achievement title (hero)
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 78px ui-sans-serif, system-ui, sans-serif";
  wrapText(ctx, achievement, 60, 270, W - 120, 90, 2);

  // Subtitle: game · label · detail
  const subtitle = [gameName, puzzleLabel, detail]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillStyle = withAlpha(accent, 0.95);
  ctx.font = "500 36px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(subtitle, 60, 470);

  // Domain footer
  ctx.fillStyle = withAlpha("#ffffff", 0.45);
  ctx.font = "400 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("leslieplay.xyz", 60, 566);

  return canvas;
}

/**
 * Share a canvas card image. Mobile → native share with file;
 * desktop → clipboard image + link, or download fallback.
 * Returns "shared" | "copied" | "downloaded" | "cancelled" | "unavailable".
 */
export async function shareCardImage({
  navigatorLike,
  canvas,
  title,
  text,
  url,
  fileName = "leslie-play-card.png",
}) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return "unavailable";

  const file = new File([blob], fileName, { type: "image/png" });
  const canShareFiles =
    typeof navigatorLike?.canShare === "function" &&
    typeof navigatorLike?.share === "function" &&
    navigatorLike.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigatorLike.share({ files: [file], title, text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  // Desktop / no file share: try clipboard image, always copy link text too
  let imageCopied = false;
  if (
    typeof navigatorLike?.clipboard?.write === "function" &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigatorLike.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      imageCopied = true;
    } catch {
      imageCopied = false;
    }
  }

  if (
    !imageCopied &&
    typeof navigatorLike?.clipboard?.writeText === "function"
  ) {
    await navigatorLike.clipboard.writeText(`${text}\n${url}`);
  }

  // Always offer a downloadable file on desktop so the card is never lost
  if (!canShareFiles) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return imageCopied ? "copied" : "downloaded";
  }

  return imageCopied ? "copied" : "unavailable";
}
