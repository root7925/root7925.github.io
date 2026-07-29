import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const gameDirectory = process.argv[2];
const checkOnly = process.argv.includes("--check");

if (!gameDirectory) {
  throw new Error("Usage: node scripts/stamp-game-assets.mjs <game-directory>");
}

const root = resolve(gameDirectory);
const manifest = JSON.parse(
  readFileSync(resolve(root, "release-assets.json"), "utf8"),
);
const versionPattern = /\?v=[a-zA-Z0-9._-]+/g;
const normalizedAssets = manifest.assets.map((file) =>
  readFileSync(resolve(root, file), "utf8").replace(versionPattern, "?v=BUILD"),
);
const version = createHash("sha256")
  .update(normalizedAssets.join("\n---asset---\n"))
  .digest("hex")
  .slice(0, 12);

let mismatches = 0;
for (const file of manifest.references) {
  const path = resolve(root, file);
  const source = readFileSync(path, "utf8");
  const matches = source.match(versionPattern) ?? [];
  if (matches.length === 0) {
    throw new Error(`${file} does not contain an asset version marker.`);
  }
  const stamped = source.replace(versionPattern, `?v=${version}`);
  if (source !== stamped) {
    mismatches += 1;
    if (!checkOnly) writeFileSync(path, stamped);
  }
}

if (checkOnly && mismatches > 0) {
  throw new Error(
    `Static assets are not stamped with ${version}. Run npm run assets:stamp.`,
  );
}

process.stdout.write(
  checkOnly
    ? `Static asset version ${version} is current.\n`
    : `Stamped static assets with ${version}.\n`,
);
