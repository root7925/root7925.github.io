# Third-party components

Every vendored dependency must be recorded here before release. Public source
visibility is not treated as a reuse license.

## Matter.js

- Version: 0.20.0
- Project: https://github.com/liabru/matter-js
- Use: 2D rigid-body physics for Pebble Choir
- License: MIT
- Vendored files:
  - `shared/vendor/matter-js/matter.min.js`
  - `shared/vendor/matter-js/LICENSE`
- We reuse the engine only. Pebble Choir rules, visuals, sounds, interface,
  scoring, tests, and product identity are original Leslie / Play work.
