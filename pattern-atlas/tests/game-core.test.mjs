import assert from "node:assert/strict";
import test from "node:test";

import {
  boardMatchesTarget,
  placementAllowed,
  rotateClockwise,
} from "../game-core.js";

test("a full board only wins when every color matches the target", () => {
  const targetColors = new Map([
    ["0,0", "red"], ["1,0", "blue"],
    ["0,1", "blue"], ["1,1", "red"],
  ]);
  const correct = [
    { x: 0, y: 0, color: "red" }, { x: 1, y: 0, color: "blue" },
    { x: 0, y: 1, color: "blue" }, { x: 1, y: 1, color: "red" },
  ];
  const wrong = [...correct.slice(0, 3), { x: 1, y: 1, color: "blue" }];

  assert.equal(boardMatchesTarget({ size: 2, targetColors, placedCells: correct }), true);
  assert.equal(boardMatchesTarget({ size: 2, targetColors, placedCells: wrong }), false);
});

test("a full target rejects a piece that only fits geometrically", () => {
  const cells = [{ x: 0, y: 0, color: "blue" }];
  assert.equal(placementAllowed({
    cells,
    origin: { x: 0, y: 0 },
    size: 2,
    occupied: new Set(),
    clueColors: new Map([["0,0", "red"]]),
  }), false);
});

test("four clockwise rotations restore a piece exactly", () => {
  const initial = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  let cells = initial;
  for (let turn = 0; turn < 4; turn += 1) cells = rotateClockwise(cells);
  assert.deepEqual(cells, initial);
});
