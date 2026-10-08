// Regenerates the elite-dev mod's TypeScript types, then runs every check on the mod, stopping at
// the first failure. The types come from a real `claude` session, so it needs a signed-in CLI.
// The session runs on a temporary copy of the plugin, and the real types are replaced only after
// the copy produced them, so a failed run leaves the existing types in place.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const pluginDir = "plugins/elite-dev";
const types = `${pluginDir}/.claude-plugin/types`;
const generate = (dir) => `claude --plugin-dir "${dir}" -p "Reply with the word ok."`;
const checks = ["npm test", "npm run validate:plugins", "npm run typecheck", "npm run lint"];

function run(command) {
  console.log(`\n> ${command}`);
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  if (status !== 0) {
    console.error(`\npre-pr failed at: ${command}`);
    process.exit(status ?? 1);
  }
}

function regenerateTypes() {
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z", pluginDir], {
    encoding: "utf8"
  })
    .split("\0")
    .filter((file) => file && fs.existsSync(file));

  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "elite-dev-types-"));
  try {
    for (const file of files) {
      const target = path.join(copy, path.relative(pluginDir, file));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    }

    run(generate(copy));

    const generated = path.join(copy, ".claude-plugin", "types");
    if (!fs.existsSync(path.join(generated, "claude-code", "index.d.ts"))) {
      console.error("\npre-pr failed: the claude session did not write the mod types.");
      process.exit(1);
    }

    fs.rmSync(types, { recursive: true, force: true });
    fs.cpSync(generated, types, { recursive: true });
  } finally {
    // The claude session can hold the folder for a moment after it exits, so removal retries.
    fs.rmSync(copy, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

regenerateTypes();
checks.forEach((command) => run(command));
