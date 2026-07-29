# Leslie / Play Game Quality Standard

## Why this exists

A mathematically valid puzzle can still feel broken when its interface promises
an action that its content data forbids. Quality therefore needs three aligned
contracts:

1. **Rule contract** — what moves are legal and what counts as a win.
2. **Content contract** — what every level and piece must provide.
3. **Interaction contract** — what a click, repeat click, drag, restart, and
   next-level action must do.

## Shared architecture

```text
private generator + solver
          ↓ validated export
public content pack → pure game core → browser adapter
          ↓                 ↓              ↓
   content tests       rule tests     interaction smoke test
```

- The private engine owns generation, uniqueness, answers, and diagnostics.
- The public content pack contains only the geometry and colors required to
  play.
- The pure core owns rotation, placement, completion, and input decisions.
- The browser adapter owns DOM rendering, pointer events, accessibility, local
  progress, and responsive layout.

## Automatic gates

- `npm test` runs all deterministic checks.
- `npm run test:watch` reruns them while developing.
- `npm run assets:stamp` derives a content fingerprint for a game's public
  code, collection, and styles. GitHub Pages then serves changed URLs instead
  of silently reusing an old game from browser cache.
- The committed pre-push hook runs tests before code leaves the machine.
- GitHub Actions runs the same suite on every push and pull request.

The current suite must cover:

- exact target matching, not geometry-only completion;
- four rotations returning a shape to its origin;
- repeat tapping a selected fragment advancing rotation;
- every shipped fragment offering the promised rotation interaction;
- collection size, IDs, area, and private-field exclusion;
- mobile board and tray layout budgets.

## Bug workflow

For every reproducible bug:

1. capture the broken user-visible contract;
2. add or strengthen a regression test;
3. make the smallest fix in core, content, or adapter;
4. run the full suite;
5. stamp changed public assets;
6. verify the real browser interaction locally;
7. publish only after both automated and browser checks pass;
8. verify the live URL and console.

## Rule for future games

New games reuse this quality gate before adding monetization, analytics, or
content scale. A second game may have different rules, but it must keep the same
separation of content, pure core, browser adapter, and automated release checks.

## Portfolio release contract

Each shipped game must add itself to the repository-level `npm test`,
`npm run assets:stamp`, and `npm run verify` commands. This makes the release
gate cumulative: changing the second game still protects the first, and future
shared refactors must keep every released title green.

Private generators must reject unsolved or non-unique content before export.
Public tests then verify the exported shape, interaction contract, completion
rules, mobile tap budget, and absence of private fields.

## Sharing contract

Any game with a completion share must follow
`docs/SHARING_GROWTH_STANDARD.md`. Shared behavior lives in
`shared/share-core.js`; it must not be reimplemented differently per game.
Deep links and native-share/clipboard fallbacks are part of the automatic test
suite and the public asset fingerprint.
