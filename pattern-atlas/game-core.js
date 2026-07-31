/**
 * @module pattern-atlas/game-core
 * @contract
 *  输入: cells [{x,y,color}], rotation (0-3), size (board 边长), occupied (Set), clueColors (Map), targetColors (Map)
 *  输出: 变换后的 cells / 旋转后的 cells / 布尔判定 / 布局度量对象
 *  不变式: 4 次 rotateClockwise 回到原形状；normalize 平移到 (0,0)；
 *          placementAllowed 检查边界+占用+线索色匹配；boardMatchesTarget 要求精确匹配 target（非仅填满）
 *  边界: 空 cells → 空结果；allowedRotations 长度<2 → 返回首个或 0；placementOriginForTap 无合法位时返回居中坐标
 *  公私: PUBLIC（可进 root7925.github.io）
 *  依赖: 无（独立于 grid-core，因 Pattern Atlas 使用 color 而非 tone，且 board 为正方形 size×size）
 *  状态: stable
 */
export function normalize(cells) {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({
    ...cell,
    x: cell.x - minX,
    y: cell.y - minY,
  }));
}

export function rotateClockwise(cells) {
  const maxY = Math.max(...cells.map((cell) => cell.y));
  return normalize(cells.map((cell) => ({
    ...cell,
    x: maxY - cell.y,
    y: cell.x,
  })));
}

export function dimensions(cells) {
  return {
    width: Math.max(...cells.map((cell) => cell.x)) + 1,
    height: Math.max(...cells.map((cell) => cell.y)) + 1,
  };
}

export function stablePieceDimensions(piece) {
  let cells = piece.cells.map((cell) => ({ ...cell }));
  const sizes = [];
  for (let turn = 0; turn < 4; turn += 1) {
    sizes.push(dimensions(cells));
    cells = rotateClockwise(cells);
  }
  return {
    width: Math.max(...sizes.map((size) => size.width)),
    height: Math.max(...sizes.map((size) => size.height)),
  };
}

export function resolveTapAction({ wasSelected, selectedId, pieceId }) {
  return wasSelected && selectedId === pieceId ? "rotate" : "select";
}

export function resolveBoardTap({ hasSelection, placementIsValid }) {
  if (!hasSelection) return "ignore";
  return placementIsValid ? "place" : "reject";
}

export function placementOriginForTap({
  cells,
  tap,
  size,
  isAllowed = () => true,
}) {
  const { width, height } = dimensions(cells);
  const centered = {
    x: Math.max(0, Math.min(size - width, tap.x - Math.floor(width / 2))),
    y: Math.max(0, Math.min(size - height, tap.y - Math.floor(height / 2))),
  };
  const candidates = [centered, ...cells.map((cell) => ({
    x: tap.x - cell.x,
    y: tap.y - cell.y,
  }))];
  const unique = new Map();

  for (const origin of candidates) {
    if (
      origin.x < 0 ||
      origin.y < 0 ||
      origin.x + width > size ||
      origin.y + height > size
    ) {
      continue;
    }
    unique.set(`${origin.x},${origin.y}`, origin);
  }

  return [...unique.values()]
    .sort((left, right) =>
      Math.abs(left.x - centered.x) +
      Math.abs(left.y - centered.y) -
      Math.abs(right.x - centered.x) -
      Math.abs(right.y - centered.y)
    )
    .find(isAllowed) ?? centered;
}

export function nextAllowedRotation(current, allowedRotations) {
  if (allowedRotations.length < 2) return allowedRotations[0] ?? 0;
  const currentIndex = allowedRotations.indexOf(current);
  return allowedRotations[(currentIndex + 1) % allowedRotations.length];
}

export function placementAllowed({
  cells,
  origin,
  size,
  occupied,
  clueColors,
}) {
  return cells.every((cell) => {
    const x = cell.x + origin.x;
    const y = cell.y + origin.y;
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= size || y >= size || occupied.has(key)) {
      return false;
    }
    const clueColor = clueColors.get(key);
    return clueColor === undefined || clueColor === cell.color;
  });
}

/**
 * A completed board is only a win when every painted cell matches the intended
 * field. This remains separate from placementAllowed: inference studies may
 * permit provisional placements from partial clues, but must not celebrate an
 * arrangement that merely fills the frame.
 */
export function boardMatchesTarget({ size, targetColors, placedCells }) {
  if (placedCells.length !== size * size) return false;
  const occupied = new Set();

  return placedCells.every(({ x, y, color }) => {
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= size || y >= size || occupied.has(key)) {
      return false;
    }
    occupied.add(key);
    return targetColors.get(key) === color;
  });
}

export function computeLayoutMetrics({
  stageWidth,
  viewportHeight,
  levelSize,
  stableSizes,
  clueMode = false,
}) {
  const compact = stageWidth < 620;
  const pieceCount = stableSizes.length;
  const maxWidth = Math.max(...stableSizes.map((size) => size.width));
  const maxHeight = Math.max(...stableSizes.map((size) => size.height));
  const trayColumns = compact ? Math.min(3, pieceCount) : pieceCount;
  const trayRows = Math.ceil(pieceCount / trayColumns);
  const slot = stageWidth / trayColumns;

  const measure = (boardPixels, trayCellLimit = Number.POSITIVE_INFINITY) => {
    const cell = boardPixels / levelSize;
    const hideTarget = compact && clueMode;
    const targetPixels = hideTarget
      ? 0
      : compact
        ? Math.min(88, Math.max(70, boardPixels * 0.32))
        : clueMode
          ? Math.min(150, Math.max(128, boardPixels * 0.43))
          : Math.min(132, Math.max(104, boardPixels * 0.38));
    const targetTop = compact ? 48 : 42;
    const boardTop = compact
      ? hideTarget ? 96 : targetTop + targetPixels + 50
      : 42 + targetPixels + 82;
    const trayCell = compact
      ? Math.max(
          12,
          Math.min(19, cell * 0.42, (slot - 14) / maxWidth, trayCellLimit),
        )
      : Math.max(19, Math.min(cell * 0.52, (slot - 12) / maxWidth));
    const maxTrayHeight = maxHeight * trayCell;
    const trayGap = compact ? 12 : 18;
    const boardTrayGap = compact ? 43 : 66;
    const trayTop = boardTop + boardPixels + boardTrayGap;
    const bottomSpace = compact ? 28 : 52;
    const height = trayTop
      + (maxTrayHeight * trayRows)
      + (trayGap * Math.max(0, trayRows - 1))
      + bottomSpace;

    return {
      compact,
      hideTarget,
      boardPixels,
      cell,
      left: (stageWidth - boardPixels) / 2,
      top: boardTop,
      targetPixels,
      targetCell: targetPixels / levelSize,
      targetLeft: (stageWidth - targetPixels) / 2,
      targetTop,
      trayTop,
      trayCell,
      trayColumns,
      trayRows,
      trayRowHeight: maxTrayHeight + trayGap,
      height,
    };
  };

  if (!compact) {
    return measure(Math.min(Math.max(stageWidth - 32, 220), 350));
  }

  const heightBudget = Math.max(520, viewportHeight - 88);
  const minimumBoard = Math.min(stageWidth - 24, Math.max(210, levelSize * 42));
  let boardPixels = Math.min(stageWidth - 24, 300);
  let result = measure(boardPixels);
  while (result.height > heightBudget && boardPixels > minimumBoard) {
    boardPixels = Math.max(minimumBoard, boardPixels - 2);
    result = measure(boardPixels);
  }
  if (result.height > heightBudget) {
    const trayGap = 12;
    const bottomSpace = 28;
    const fixedHeight =
      result.trayTop
      + trayGap * Math.max(0, result.trayRows - 1)
      + bottomSpace;
    const availablePerPieceRow =
      (heightBudget - fixedHeight) / result.trayRows;
    const trayCellLimit = availablePerPieceRow / maxHeight;
    result = measure(boardPixels, trayCellLimit);
  }
  return result;
}
