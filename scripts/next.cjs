const { spawnSync } = require("node:child_process");
const path = require("node:path");
// Keep module paths on C: while the directory junction stores package bytes on D:.
const result = spawnSync(
  process.execPath,
  [
    "--preserve-symlinks",
    "--preserve-symlinks-main",
    path.join(__dirname, "../node_modules/next/dist/bin/next"),
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS,
        "--preserve-symlinks",
        "--preserve-symlinks-main",
      ]
        .filter(Boolean)
        .join(" "),
    },
  },
);
process.exit(result.status ?? 1);
