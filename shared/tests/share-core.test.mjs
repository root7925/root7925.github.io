import test from "node:test";
import assert from "node:assert/strict";

import {
  achievementFor,
  challengeText,
  challengeUrl,
  scoreText,
  scoreUrl,
  runScoreText,
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

test("score shares strip every private or incidental URL parameter", () => {
  assert.equal(
    scoreUrl({ href: "https://example.com/signal/?seed=secret&score=900#debug" }),
    "https://example.com/signal/",
  );
});

test("score copy celebrates a verified local result without fake rank claims", () => {
  const text = scoreText({
    achievement: "Signal Keeper",
    gameName: "Signal Stack",
    score: 1240,
    cleanCount: 3,
  });
  assert.match(text, /1,240/);
  assert.match(text, /3 clean signals/);
  assert.doesNotMatch(text, /top|rank|percent/i);
});

test("generic run copy supports game-specific earned details", () => {
  const text = runScoreText({
    achievement: "Harmony Finder",
    gameName: "Pebble Choir",
    score: 2480,
    detail: "largest voice: Chorus",
  });
  assert.match(text, /2,480/);
  assert.match(text, /Chorus/);
  assert.doesNotMatch(text, /rank|top \d/i);
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
