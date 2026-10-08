// Runs `claude plugin test` on a copy of elite-dev holding only the files git tracks or would
// track, because the command runs every *.test.ts under the folder, gitignored ones included.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const copyPlugin = require("./copy-plugin");

const copy = copyPlugin("plugins/elite-dev", "elite-dev-mod-");
let status;
try {
  // shell: true lets Windows resolve claude.cmd and claude.exe alike. The copy is the working
  // directory, so no path reaches the shell to be split on a space.
  status = spawnSync("claude", ["plugin", "test", "."], {
    cwd: copy,
    stdio: "inherit",
    shell: true
  }).status;
} finally {
  fs.rmSync(copy, { recursive: true, force: true });
}

process.exit(status ?? 1);
