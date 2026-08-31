// PostToolUse: eslint --fix + prettier --write on every Write/Edit
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { truncatedOutput } = require("./lib/output");

try {
  const d = JSON.parse(fs.readFileSync(0, "utf8"));
  const f = d?.tool_input?.file_path;
  if (!f) process.exit(0);

  const cwd = process.cwd();
  const messages = [];

  // In an npm/yarn/pnpm workspace, ESLint/Prettier are typically hoisted to the
  // workspace root's node_modules only — a sub-package's own node_modules
  // won't have them. Walk up from cwd (mirroring Node's own module resolution
  // and how npx locates binaries) so the gates below don't misdetect "not
  // installed" just because cwd is a sub-package directory.
  //
  // Resolve the package's own bin *script* via its package.json "bin" field,
  // not the node_modules/.bin/<name> shim — on Windows that shim is a `.cmd`
  // batch file, which only cmd.exe can run. Spawning it would need shell:true,
  // routing `f` (traced back to a tool call's file_path) through cmd.exe's
  // metacharacter parsing. Spawning the resolved JS script with node itself
  // needs no shell, and no shell-metacharacter parsing of `f`, on any platform.
  function findBinScript(name) {
    let dir = cwd;
    for (;;) {
      const pkgDir = path.join(dir, "node_modules", name);
      const pkgJsonPath = path.join(pkgDir, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
        const bin =
          typeof pkg.bin === "string" ? pkg.bin : (pkg.bin?.[name] ?? Object.values(pkg.bin ?? {})[0]);
        if (bin) return path.join(pkgDir, bin);
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null; // reached filesystem root
      dir = parent;
    }
  }

  // ESLint only understands JS/TS source files — running it on README.md,
  // package.json, etc. produces noisy "fatal" errors for unsupported file types.
  //
  // Only invoke it if this project actually has eslint installed. Without this
  // gate, `npx eslint` in a project with no eslint devDependency falls back to
  // npx's package-resolution/prompt behavior, which commonly exits 1 — the same
  // code ESLint itself uses for "ran fine, found lint issues" — so a project
  // that simply doesn't use ESLint would get misreported as having lint errors
  // (or, before this fix, have that failure silently swallowed).
  const eslintBin = findBinScript("eslint");
  if (/\.(ts|tsx|mts|cts|js|jsx|cjs|mjs)$/.test(f) && eslintBin) {
    // Spawn the already-resolved script with node directly rather than `npx
    // eslint` — npx re-resolves the package on every invocation, which is a
    // wasted extra process layer on a hook that fires on nearly every
    // Write/Edit tool call. Spawning a JS script with node needs no shell on
    // any platform, so `f` is passed through as one literal argument.
    const eslint = spawnSync(process.execPath, [eslintBin, "--fix", f], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    // Exit 1 = unfixable lint warnings (expected — ESLint ran fine and found issues).
    // Anything else (2 = fatal config/parse error, non-standard codes, null = killed)
    // means linting silently never happened even though eslint is installed — report it.
    if (eslint.status !== 0 && eslint.status !== 1) {
      // A null status/signal means spawnSync could not even start the binary
      // (e.g. EACCES) — the only diagnostic for that case lives in `.error`.
      const detail = eslint.error
        ? `could not spawn eslint: ${eslint.error.message}`
        : truncatedOutput(eslint.stdout, eslint.stderr, { head: 10 });
      messages.push(
        `ESLint did not run on ${path.basename(f)} (exit ${eslint.status ?? `signal ${eslint.signal}`}) — linting was not applied:\n${detail}`
      );
    }
  }

  // Same rationale as the ESLint gate above: without this, a project with no
  // prettier devDependency triggers `npx prettier`'s package-resolution/install
  // behavior on every single Write/Edit, and any resulting non-zero exit gets
  // misreported below as a formatting failure rather than "prettier isn't set up".
  const prettierBin = findBinScript("prettier");
  if (prettierBin) {
    // Same rationale as the ESLint spawn above: use the already-resolved
    // script directly instead of routing through `npx prettier`.
    const prettier = spawnSync(process.execPath, [prettierBin, "--write", "--ignore-unknown", f], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (prettier.status !== 0) {
      // Same rationale as the ESLint block above: a null status/signal means
      // spawnSync could not start the binary, and `.error` has the real cause.
      const detail = prettier.error
        ? `could not spawn prettier: ${prettier.error.message}`
        : truncatedOutput(prettier.stdout, prettier.stderr, { head: 10 });
      messages.push(
        `Prettier error on ${path.basename(f)} (exit ${prettier.status ?? `signal ${prettier.signal}`}) — formatting was not applied:\n${detail}`
      );
    }
  }

  // Emit a single JSON payload — concatenated JSON objects are invalid and may be ignored.
  if (messages.length) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: messages.join("\n\n")
        }
      })
    );
  }
} catch (err) {
  // Never let an unexpected input shape (e.g. a different harness's event schema)
  // crash the hook uncaught — that's a non-blocking error, but it's silent and
  // gives no signal that formatting was skipped. Log to stderr and exit clean.
  process.stderr.write(`format.js: skipping — ${err.message}\n`);
  process.exit(0);
}
