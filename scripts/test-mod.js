// Runs `claude plugin test` on a copy of elite-dev holding only the files git tracks or would
// track, because the command runs every *.test.ts under the folder, gitignored ones included.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pluginDir = "plugins/elite-dev";
const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z", pluginDir], {
  encoding: "utf8"
})
  .split("\0")
  .filter((file) => file && fs.existsSync(file));

const copy = fs.mkdtempSync(path.join(os.tmpdir(), "elite-dev-mod-"));
let status;
try {
  for (const file of files) {
    const target = path.join(copy, path.relative(pluginDir, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  }

  // shell: true lets Windows resolve claude.cmd and claude.exe alike.
  status = spawnSync("claude", ["plugin", "test", copy], { stdio: "inherit", shell: true }).status;
} finally {
  fs.rmSync(copy, { recursive: true, force: true });
}

process.exit(status ?? 1);
