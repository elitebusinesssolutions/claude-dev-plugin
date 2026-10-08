// Copies the files git tracks or would track under a plugin folder into a new temporary folder and
// returns its path. Gitignored files stay out, and the caller removes the folder.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

module.exports = function copyPlugin(pluginDir, prefix) {
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z", pluginDir], {
    encoding: "utf8"
  })
    .split("\0")
    .filter((file) => file && fs.existsSync(file));

  const copy = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    for (const file of files) {
      const target = path.join(copy, path.relative(pluginDir, file));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file, target);
    }
  } catch (error) {
    fs.rmSync(copy, { recursive: true, force: true });
    throw error;
  }

  return copy;
};
