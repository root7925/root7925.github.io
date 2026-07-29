export const SOUND_PREFERENCE_KEY = "leslie-play:sound-enabled:v1";

const CUES = Object.freeze({
  mark: [
    { frequency: 420, duration: 0.035, gain: 0.022, type: "triangle" },
  ],
  place: [
    { frequency: 523.25, duration: 0.09, gain: 0.045, type: "sine" },
    { frequency: 783.99, duration: 0.12, gain: 0.025, type: "sine", delay: 0.035 },
  ],
  clear: [
    { frequency: 392, duration: 0.055, gain: 0.025, type: "triangle" },
  ],
  conflict: [
    { frequency: 196, duration: 0.11, gain: 0.04, type: "triangle" },
    { frequency: 174.61, duration: 0.13, gain: 0.026, type: "triangle", delay: 0.045 },
  ],
  progress: [
    { frequency: 659.25, duration: 0.08, gain: 0.035, type: "sine" },
    { frequency: 880, duration: 0.11, gain: 0.028, type: "sine", delay: 0.05 },
  ],
  complete: [
    { frequency: 523.25, duration: 0.18, gain: 0.045, type: "sine" },
    { frequency: 659.25, duration: 0.2, gain: 0.038, type: "sine", delay: 0.09 },
    { frequency: 783.99, duration: 0.24, gain: 0.034, type: "sine", delay: 0.18 },
    { frequency: 1046.5, duration: 0.3, gain: 0.03, type: "sine", delay: 0.3 },
  ],
});

export function readSoundPreference(storageLike) {
  try {
    const value = storageLike?.getItem?.(SOUND_PREFERENCE_KEY);
    return value === null || value === undefined ? true : value === "true";
  } catch {
    return true;
  }
}

export function writeSoundPreference(storageLike, enabled) {
  try {
    storageLike?.setItem?.(SOUND_PREFERENCE_KEY, String(Boolean(enabled)));
  } catch {
    // Sound remains usable when storage is unavailable.
  }
  return Boolean(enabled);
}

export function createFeedbackSystem({
  windowLike = globalThis.window,
  storageLike = globalThis.localStorage,
} = {}) {
  let enabled = readSoundPreference(storageLike);
  let audioContext = null;

  const reducedMotion = Boolean(
    windowLike?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );

  function getContext() {
    if (!enabled) return null;
    const Context = windowLike?.AudioContext || windowLike?.webkitAudioContext;
    if (!Context) return null;
    audioContext ||= new Context();
    if (audioContext.state === "suspended") {
      audioContext.resume?.();
    }
    return audioContext;
  }

  function play(cueName) {
    const notes = CUES[cueName];
    return playNotes(notes);
  }

  function playNotes(notes) {
    const context = getContext();
    if (!context || !notes) return false;

    const start = context.currentTime;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + (note.delay || 0);
      const noteEnd = noteStart + note.duration;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(note.gain, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    }
    return true;
  }

  function vibrate(pattern) {
    if (reducedMotion || !windowLike?.navigator?.vibrate) return false;
    return Boolean(windowLike.navigator.vibrate(pattern));
  }

  function setEnabled(nextEnabled) {
    enabled = writeSoundPreference(storageLike, nextEnabled);
    if (!enabled && audioContext?.state === "running") {
      audioContext.suspend?.();
    }
    return enabled;
  }

  return {
    get enabled() {
      return enabled;
    },
    reducedMotion,
    play,
    playTone({
      frequency,
      duration = 0.16,
      gain = 0.04,
      type = "sine",
      harmony = [],
    }) {
      const notes = [
        { frequency, duration, gain, type },
        ...harmony.map((ratio, index) => ({
          frequency: frequency * ratio,
          duration: duration + 0.05,
          gain: gain * 0.62,
          type,
          delay: 0.035 * (index + 1),
        })),
      ];
      return playNotes(notes);
    },
    vibrate,
    setEnabled,
    toggle() {
      return setEnabled(!enabled);
    },
  };
}
