import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeUrl = new URL("../../index.html", import.meta.url);

test("the studio home links and explains all three released games", async () => {
  const html = await readFile(homeUrl, "utf8");
  const games = [
    ["pattern-atlas/", "Rotate and fit colored fragments"],
    ["lantern-grove/", "Place lanterns by row, region, and spacing clues"],
    ["signal-stack/", "Place two-tone pieces, clear full lines"],
  ];

  for (const [href, description] of games) {
    assert.match(html, new RegExp(`href="${href.replace("/", "\\/")}"`));
    assert.ok(html.includes(description));
  }
});

test("the public home does not expose the source repository", async () => {
  const html = await readFile(homeUrl, "utf8");
  assert.equal(html.includes("github.com/root7925"), false);
});
