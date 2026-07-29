const SHAPES = [
  { name: "domino", cells: [[0, 0], [1, 0]] },
  { name: "line-three", cells: [[0, 0], [1, 0], [2, 0]] },
  { name: "corner-three", cells: [[0, 0], [0, 1], [1, 1]] },
  { name: "square", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "tee", cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { name: "ell", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { name: "zig", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
];

const TONE_PATTERNS = {
  2: [
    ["light", "dark"],
    ["dark", "light"],
    ["light", "light"],
    ["dark", "dark"],
  ],
  3: [
    ["light", "dark", "light"],
    ["dark", "light", "dark"],
    ["light", "light", "dark"],
    ["dark", "dark", "light"],
  ],
  4: [
    ["light", "dark", "light", "dark"],
    ["dark", "light", "dark", "light"],
    ["light", "light", "dark", "dark"],
    ["dark", "dark", "light", "light"],
  ],
};

function pick(items, random) {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

export function drawPiece(random, id) {
  const shape = pick(SHAPES, random);
  const tones = pick(TONE_PATTERNS[shape.cells.length], random);
  return {
    id,
    name: shape.name,
    cells: shape.cells.map(([x, y], index) => ({
      x,
      y,
      tone: tones[index],
    })),
  };
}

export function publicDeckContract() {
  return {
    shapeCount: SHAPES.length,
    maximumCells: Math.max(...SHAPES.map((shape) => shape.cells.length)),
    tones: ["light", "dark"],
  };
}
