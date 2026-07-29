import test from "node:test";
import assert from "node:assert/strict";

import {
  SOUND_PREFERENCE_KEY,
  createFeedbackSystem,
  readSoundPreference,
  writeSoundPreference,
} from "../feedback-core.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    value(key) {
      return values.get(key);
    },
  };
}

test("sound defaults on and persists one shared preference", () => {
  const storage = createStorage();
  assert.equal(readSoundPreference(storage), true);
  assert.equal(writeSoundPreference(storage, false), false);
  assert.equal(storage.value(SOUND_PREFERENCE_KEY), "false");
  assert.equal(readSoundPreference(storage), false);
});

test("feedback remains safe when browser audio is unavailable", () => {
  const feedback = createFeedbackSystem({
    storageLike: createStorage(),
    windowLike: {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    },
  });
  assert.equal(feedback.play("place"), false);
  assert.equal(feedback.vibrate(10), false);
});

test("toggle updates the preference without creating audio eagerly", () => {
  const storage = createStorage();
  let contexts = 0;
  class FakeContext {
    constructor() {
      contexts += 1;
      this.state = "running";
    }
  }
  const feedback = createFeedbackSystem({
    storageLike: storage,
    windowLike: {
      AudioContext: FakeContext,
      matchMedia: () => ({ matches: false }),
      navigator: {},
    },
  });

  assert.equal(contexts, 0);
  assert.equal(feedback.toggle(), false);
  assert.equal(storage.value(SOUND_PREFERENCE_KEY), "false");
  assert.equal(contexts, 0);
});

test("reduced-motion preference prevents vibration", () => {
  let calls = 0;
  const feedback = createFeedbackSystem({
    storageLike: createStorage(),
    windowLike: {
      matchMedia: () => ({ matches: true }),
      navigator: {
        vibrate() {
          calls += 1;
          return true;
        },
      },
    },
  });
  assert.equal(feedback.reducedMotion, true);
  assert.equal(feedback.vibrate([10, 20]), false);
  assert.equal(calls, 0);
});
