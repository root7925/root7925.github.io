# Shared feedback system

`shared/feedback-core.js` is the one feedback boundary for Leslie / Play games.
New games must use it instead of creating unrelated sound settings or audio
bootstrapping.

## What it owns

- one local sound preference shared across the portfolio;
- lazy Web Audio startup after a real player gesture;
- short procedural cues with no downloaded audio assets;
- arbitrary pitched tones for musical mechanics;
- optional vibration;
- reduced-motion detection and vibration suppression;
- safe fallback when audio, vibration, or local storage is unavailable.

## Event vocabulary

- `mark`: a light editing action;
- `place`: a successful ordinary placement;
- `clear`: removal or reversal;
- `conflict`: a rejected or rule-breaking action;
- `progress`: a completed intermediate constraint;
- `complete`: a run or puzzle completion;
- `playTone(...)`: a game-owned musical event such as a Pebble Choir merge.

Continuous background music is not part of the shared layer. A game must earn
that extra asset and retention cost through player evidence.

## Product rule

Feedback explains state; it must not hide weak rules. Every cue has a visual
equivalent, mute state persists locally, and reduced-motion players retain the
same information without animation or vibration.
