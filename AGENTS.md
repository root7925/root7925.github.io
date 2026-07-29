# Leslie / Play engineering constraints

These rules apply to every game in this repository.

## Release gate

- Run `npm run verify` after every code or content change.
- Run `npm run assets:stamp` after changing a game's public code, content, or
  styles. Verification fails when a stale browser-cache version is detected.
- Never commit, push, or publish when verification fails.
- After a UI interaction change, verify the real interaction in a browser.
- A release is complete only after the live URL is checked for console errors.

## Required test layers

Every game must have automated checks for:

1. deterministic rules and mathematical correctness;
2. content-pack structure and invariants;
3. the main input contract, including repeated taps and drag behavior;
4. completion, restart, and next-level transitions;
5. mobile layout budgets and horizontal overflow;
6. privacy boundaries for generators, solutions, seeds, and analytics.
7. static-asset versioning so live users do not receive a stale game.

When a user reports a bug, add a failing regression test before or with the fix.

## Reusable architecture

- Keep game rules and interaction decisions in pure modules.
- Keep level/content data separate from rendering.
- Keep the browser layer thin: input, rendering, accessibility, and persistence.
- Prefer extending shared test helpers over writing one-off manual checks.
- Generate content through validated recipes; do not hand-copy large level packs.

## Public/private boundary

Public builds may contain only assets required to play. Generators, solvers,
seeds, authored solutions, answer keys, unpublished packs, and production
diagnostics remain private.
