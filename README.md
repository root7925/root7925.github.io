# Leslie / Play

The public home for small games and interactive things by Leslie.

## Publishing

This repository is intended to be named `root7925.github.io` and published with GitHub Pages. The public page must stay small and authored:

- one clear entry point to the current game;
- a short field note for genuine milestones;
- no copied Nicky Case writing, illustration, branding, or site code;
- no private Pattern Atlas generator or solver code.

The current releases are:

- **Pattern Atlas: The First Atlas**, a 16-study spatial assembly collection at
  `/pattern-atlas/`.
- **Lantern Grove: Collection 01**, a 16-puzzle single-tap deduction collection
  at `/lantern-grove/`.
- **Signal Stack**, an endless two-tone spatial score game at `/signal-stack/`.
- **Pebble Choir**, a one-thumb physics merge and procedural music test at
  `/pebble-choir/`.

Progress is saved locally in the browser.

Only the client games and exported puzzle collections are public. Generator
seeds, authored placements, solvers, and generation diagnostics stay in the
private product workspace.

Run the public logic and collection checks with:

```sh
npm test
```

`npm run test:watch` reruns the suite during development. A repository
pre-push hook and the `Game quality` GitHub Actions workflow run the same gate
automatically. The cross-game release rules are recorded in
[`docs/GAME_QUALITY_STANDARD.md`](docs/GAME_QUALITY_STANDARD.md).
Shared sound, motion, and haptic behavior is documented in
[`docs/FEEDBACK_SYSTEM.md`](docs/FEEDBACK_SYSTEM.md), and every vendored
dependency is recorded in [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md).
