// Regenerates the elite-dev mod's TypeScript types, then runs every check on the mod, stopping at
// the first failure. The types come from a real `claude` session, so it needs a signed-in CLI.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const types = "plugins/elite-dev/.claude-plugin/types";
const generate = 'claude --plugin-dir plugins/elite-dev -p "Reply with the word ok."';
const checks = ["npm test", "npm run validate:plugins", "npm run typecheck", "npm run lint"];

function run(command) {
  console.log(`\n> ${command}`);
  const { status } = spawnSync(command, { stdio: "inherit", shell: true });
  if (status !== 0) {
    console.error(`\npre-pr failed at: ${command}`);
    process.exit(status ?? 1);
  }
}

fs.rmSync(types, { recursive: true, force: true });
run(generate);
if (!fs.existsSync(`${types}/claude-code/index.d.ts`)) {
  console.error("\npre-pr failed: the claude session did not write the mod types.");
  process.exit(1);
}

checks.forEach(run);
