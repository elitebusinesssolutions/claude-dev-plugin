// Regenerates the elite-dev mod's TypeScript types, then runs every check on the mod, stopping at
// the first failure. The types come from a real `claude` session, so it needs a signed-in CLI.
// The session runs on a temporary copy of the plugin, and the real types are replaced only after
// the copy produced them, so a failed run leaves the existing types in place.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const copyPlugin = require("./copy-plugin");

const pluginDir = "plugins/elite-dev";
const types = `${pluginDir}/.claude-plugin/types`;
const generate = (dir) =>
  `claude --plugin-dir "${dir}" --no-session-persistence -p "Reply with the word ok."`;
const checks = [
  "npm test",
  "npm run validate:plugins",
  "npm run typecheck",
  "npm run lint",
  "npm run format:check:root"
];

class CheckFailed extends Error {
  constructor(message, status = 1) {
    super(message);
    this.status = status;
  }
}

function run(command) {
  console.log(`\n> ${command}`);
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  if (status !== 0) {
    throw new CheckFailed(`pre-pr failed at: ${command}`, status ?? 1);
  }
}

function regenerateTypes() {
  const copy = copyPlugin(pluginDir, "elite-dev-types-");
  const staged = `${types}.new`;
  try {
    run(generate(copy));

    const generated = path.join(copy, ".claude-plugin", "types");
    if (!fs.existsSync(path.join(generated, "claude-code", "index.d.ts"))) {
      throw new CheckFailed("pre-pr failed: the claude session did not write the mod types.");
    }

    // Staged beside the real types so the rename stays on one drive and a failed copy loses nothing.
    fs.rmSync(staged, { recursive: true, force: true });
    fs.cpSync(generated, staged, { recursive: true });
    fs.rmSync(types, { recursive: true, force: true });
    fs.renameSync(staged, types);
  } finally {
    // The claude session can hold the folder for a moment after it exits, so removal retries.
    fs.rmSync(copy, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    fs.rmSync(staged, { recursive: true, force: true });
  }
}

try {
  regenerateTypes();
  checks.forEach(run);
} catch (error) {
  if (!(error instanceof CheckFailed)) {
    throw error;
  }
  console.error(`\n${error.message}`);
  process.exit(error.status);
}
