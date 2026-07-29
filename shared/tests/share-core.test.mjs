import test from "node:test";
import assert from "node:assert/strict";

import {
  achievementFor,
  challengeText,
  challengeUrl,
  shareChallenge,
} from "../share-core.js";

test("achievement titles advance only after earned thresholds", () => {
  const titles = [
    { threshold: 1, title: "Beginner" },
    { threshold: 4, title: "Keeper" },
    { threshold: 16, title: "Master" },
  ];
  assert.equal(achievementFor(1, titles), "Beginner");
  assert.equal(achievementFor(9, titles), "Keeper");
  assert.equal(achievementFor(16, titles), "Master");
});

test("challenge URLs keep only the intended puzzle parameter", () => {
  assert.equal(
    challengeUrl(
      { href: "https://example.com/game/?old=1#results" },
      "g",
      7,
    ),
    "https://example.com/game/?g=7",
  );
});

test("challenge copy praises an earned identity and asks for play", () => {
  const text = challengeText({
    achievement: "Grove Keeper",
    gameName: "Lantern Grove",
    puzzleLabel: "Grove 04",
    detail: "Dawn",
  });
  assert.match(text, /Grove Keeper/);
  assert.match(text, /Can you solve the same one/);
});

test("native sharing is preferred when available", async () => {
  let payload = null;
  const result = await shareChallenge({
    navigatorLike: {
      share: async (value) => {
        payload = value;
      },
    },
    title: "Challenge",
    text: "Try it",
    url: "https://example.com",
  });
  assert.equal(result, "shared");
  assert.equal(payload.url, "https://example.com");
});

test("clipboard is a deterministic fallback", async () => {
  let copied = "";
  const result = await shareChallenge({
    navigatorLike: {
      clipboard: {
        writeText: async (value) => {
          copied = value;
        },
      },
    },
    title: "Challenge",
    text: "Try it",
    url: "https://example.com",
  });
  assert.equal(result, "copied");
  assert.equal(copied, "Try it\nhttps://example.com");
});
