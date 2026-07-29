import { spawnSync } from "node:child_process";

const result = spawnSync(
  "git",
  ["config", "core.hooksPath", ".githooks"],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.stderr.write(
    "Could not install the local quality hook. Run npm test before pushing.\n",
  );
}
