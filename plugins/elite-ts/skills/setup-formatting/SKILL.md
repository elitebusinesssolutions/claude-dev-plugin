---
name: setup-formatting
description: Set up Prettier, ESLint auto-fix, EditorConfig, and VS Code format-on-save for a project. Use when adding formatting tooling to a new or existing repo.
---

Set up Prettier, ESLint auto-fix, EditorConfig, and VS Code format-on-save for this project. Perform each step below in order.

## 0. Detect the package manager

Check the project root for a lockfile, in this order, and use the matching package manager for every install/run/exec command below:

| Lockfile present            | Package manager | Install a dev dependency       | Run a script      | Exec a local binary |
| --------------------------- | --------------- | ------------------------------ | ----------------- | ------------------- |
| `pnpm-lock.yaml`            | pnpm            | `pnpm add -D <pkg>`            | `pnpm run <name>` | `pnpm exec <bin>`   |
| `yarn.lock`                 | Yarn            | `yarn add -D <pkg>`            | `yarn <name>`     | `yarn <bin>`        |
| `package-lock.json` or none | npm             | `npm install --save-dev <pkg>` | `npm run <name>`  | `npx <bin>`         |

The steps below show the npm form as the concrete example — substitute the detected manager's equivalent from this table everywhere an `npm install`, `npm run`, or `npx` command appears. No lockfile and no other signal (e.g. `package.json`'s `packageManager` field) defaults to npm.

## 1. Ensure an ESLint config file exists

Check for a flat config (`eslint.config.js`/`.mjs`/`.cjs`/`.ts`) or a legacy config (`.eslintrc.*`, or an `eslintConfig` key in `package.json`).

If a flat config already exists, leave it as-is and move to step 2.

If a legacy config exists, read the `eslint` devDependency version in `package.json`:

- Pinned below version 9: leave the legacy config as-is and move to step 2. This ESLint version still loads it.
- Not pinned, or pinned to 9 or higher: migrate the legacy config to flat format before moving to step 2. Step 2's install resolves the current ESLint major version. ESLint 9 stops loading legacy config by default, and ESLint 10 removes it entirely, so leaving the legacy file in place would break linting the moment step 2 installs. Read the legacy config's `extends`, `rules`, `env`, and `parserOptions`, and translate each into the equivalent flat-config `eslint.config.mjs` shape shown below (`@eslint/js` for `eslint:recommended`, `typescript-eslint` for TypeScript rules, `globals` for `env` entries like `node`/`browser`). Then delete the legacy file (or remove the `eslintConfig` key from `package.json`) — ESLint treats a project with both a flat and a legacy config as an error.

If neither exists, create a flat config baseline appropriate to the project:

- **Next.js project** (`next` listed in `package.json` dependencies): run `npm install --save-dev eslint @next/eslint-plugin-next` if either is missing (add `typescript-eslint` too if a `tsconfig.json` is present), then create `eslint.config.mjs`:

  ```js
  import next from "@next/eslint-plugin-next";

  export default [
    {
      plugins: { "@next/next": next },
      rules: {
        ...next.configs.recommended.rules,
        ...next.configs["core-web-vitals"].rules
      }
    }
  ];
  ```

  If the project has a `tsconfig.json`, also add `import tseslint from "typescript-eslint";` and spread `...tseslint.configs.recommended` into the array — the same TypeScript addition the "any other Node/TS project" branch below makes — otherwise `.ts`/`.tsx` files have no parser and are skipped or fail to parse. If there is no `tsconfig.json`, skip this addition.

- **Any other Node/TS project**: run `npm install --save-dev eslint @eslint/js globals` (add `typescript-eslint` too if a `tsconfig.json` is present), then create `eslint.config.mjs`:

  ```js
  import js from "@eslint/js";
  import globals from "globals";
  import { defineConfig } from "eslint/config";

  export default defineConfig([js.configs.recommended, { languageOptions: { globals: globals.node } }]);
  ```

  `js.configs.recommended` enables `no-undef` but does not define any runtime globals on its own — without the `languageOptions` block above, ordinary references like `console` or `process` are flagged as undefined. Swap `globals.node` for `globals.browser` (or another entry from the `globals` package) if this project doesn't run on Node.

  Add `import tseslint from "typescript-eslint";` and spread `...tseslint.configs.recommended` into the array if TypeScript is present.

Verify with `npx eslint .` before continuing — it should run (even if it reports 0 files linted because the repo has no source yet) without an "Oops! Something went wrong!" crash.

## 2. Install ESLint and any plugins its config references

Read `package.json`. If `eslint` is not already a devDependency, run `npm install --save-dev eslint`. For Next.js, install `eslint-config-next` only if the existing ESLint config extends it (common in legacy Next.js setups).

Read the config file confirmed/created in step 1 and cross-check every plugin it _uses_ against what's actually installed:

- For each rule id with a namespace prefix (e.g. `"stylistic/brace-style"`), confirm that namespace is registered — either via a `plugins: { <namespace>: ... }` entry in the same config object, or provided transitively by an extended config (e.g. `eslint-config-next`).
- A namespace referenced in a rule but never registered means the corresponding package (e.g. `stylistic` → `@stylistic/eslint-plugin`) was never installed. Install it with `npm install --save-dev <package>`, import it, and add it to the config's `plugins` map.

Verify by running `npx eslint .` — if it prints "Oops! Something went wrong!" with "could not find plugin", a plugin is still missing or unregistered. Do not proceed until this passes (even if it reports real lint errors — those are fine, a crash is not).

## 3. Add `lint` script to `package.json`

Read `package.json`. If a `lint` script is not already present in `scripts`, add:

```json
"lint": "eslint ."
```

## 4. Install Prettier

Run `npm install --save-dev prettier` to add prettier to devDependencies.

## 5. Create `.prettierrc`

Create `.prettierrc` in the project root if it does not already exist:

```json
{
  "printWidth": 100,
  "trailingComma": "none"
}
```

If it already exists, read it and report its current contents without overwriting.

## 6. Add `format` script to `package.json`

Read `package.json`. If a `format` script is not already present in `scripts`, add:

```json
"format": "prettier --write ."
```

## 7. Create `.vscode/settings.json`

Create `.vscode/settings.json` if it does not exist:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

If you are using a flat config (`eslint.config.*`), add `"eslint.useFlatConfig": true`. If you are using a legacy `.eslintrc.*`, omit it (or set it to `false`).

Also create `.vscode/extensions.json` (or merge into it) recommending `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode` — without the ESLint extension installed, `editor.codeActionsOnSave` has nothing to trigger and saves will silently only run Prettier.

## 8. Add Claude Code post-edit hook

If this is a project using the elite-ts plugin, PostToolUse formatting is already provided by `hooks/format.js` via `hooks/hooks.json` — no `.claude/settings.json` changes are needed.

For a project repo without this plugin, copy the hook script and its shared helper and wire it up. First, create `.claude/hooks/lib/output.js` with this content:

```js
// Shared helper for hook scripts (format.js): turns a
// spawned process's stdout/stderr into a single truncated string suitable
// for a failure message.
//
// stdout and stderr are joined with an explicit "\n" separator before being
// trimmed/split — without that separator, a stdout chunk that doesn't already
// end in its own trailing newline would have its last line silently merge
// with stderr's first line into one garbled line. Empty streams are dropped
// before joining so a missing stdout or stderr doesn't leave a stray blank
// line at the start/end/middle of the result.
//
// `head` mirrors Array.prototype.slice(0, n) — pass it to keep only the
// earliest lines, where the root cause of a failure usually shows up first
// (e.g. tsc/eslint errors). Omitting it returns the full (trimmed, joined) output.
function truncatedOutput(stdout, stderr, { head } = {}) {
  const combined = [stdout, stderr]
    // Strip any trailing newline(s) each stream already ends with, so joining
    // always inserts exactly one separator — never zero (the merge bug) and
    // never an extra blank line (when a stream already ended in "\n").
    .map((s) => (typeof s === "string" ? s.replace(/(\r?\n)+$/, "") : ""))
    .filter((s) => s.length > 0)
    .join("\n")
    .trim();

  const lines = combined.split(/\r?\n/);
  const sliced = head != null ? lines.slice(0, head) : lines;

  return sliced.join("\n");
}

module.exports = { truncatedOutput };
```

**a. Create `.claude/hooks/format.js`** with this content:

```js
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
  // workspace root's node_modules/.bin only — a sub-package's own node_modules
  // won't have them. Walk up from cwd (mirroring Node's own module resolution
  // and how npx locates binaries) so the gates below don't misdetect "not
  // installed" just because cwd is a sub-package directory.
  function findBin(name) {
    const binName = process.platform === "win32" ? `${name}.cmd` : name;
    let dir = cwd;
    for (;;) {
      const candidate = path.join(dir, "node_modules", ".bin", binName);
      if (fs.existsSync(candidate)) return candidate;
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
  const eslintBin = findBin("eslint");
  if (/\.(ts|tsx|mts|cts|js|jsx|cjs|mjs)$/.test(f) && eslintBin) {
    // Spawn the already-resolved binary directly rather than `npx eslint` — npx
    // re-resolves the package on every invocation, which is a wasted extra
    // process layer on a hook that fires on nearly every Write/Edit tool call.
    // `shell: true` is needed only on Windows, where the resolved binary is a
    // `.cmd` wrapper that requires cmd.exe to run. On POSIX the resolved file
    // is directly executable, so shell:true would only add unneeded
    // shell-metacharacter parsing of `f`, a value that traces back to a tool
    // call's file_path.
    const eslint = spawnSync(eslintBin, ["--fix", f], {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
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
  const prettierBin = findBin("prettier");
  if (prettierBin) {
    // Same rationale as the ESLint spawn above: use the already-resolved bin
    // path directly instead of routing through `npx prettier`, and enable
    // shell only on Windows for the same `.cmd`-wrapper reason.
    const prettier = spawnSync(prettierBin, ["--write", "--ignore-unknown", f], {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
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
```

**b. Wire it in `.claude/settings.json`** (create if missing):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": [".claude/hooks/format.js"],
            "timeout": 30,
            "statusMessage": "Formatting and linting..."
          }
        ]
      }
    ]
  }
}
```

Using `node` directly (exec form, no shell) works on all OSes without OS-specific shell variants. If a `PostToolUse` / `Write|Edit` hook already exists, show the existing command and ask whether to replace it or leave it.

## 9. Create `.editorconfig`

Create `.editorconfig` in the project root if it does not already exist:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

If it already exists, read it and report its current contents without overwriting.

## 10. Format and lint the repo

Run `npx eslint --fix .` (ESLint) and `npm run format` (Prettier) to apply both configs across all existing files. Running only Prettier here would leave pre-existing files in violation of any newly-added lint rules until each one happens to be touched later.

## 11. Verify

Run `npx eslint .` to confirm no errors were introduced by formatting. If it prints "Oops! Something went wrong!" instead of lint results, the config itself is broken (e.g. a rule references a plugin that was never installed/registered) — fix that before treating the setup as complete.

If a `tsconfig.json` exists in the project root, also run `npx tsc --noEmit`. Skip it on JS-only projects — without a tsconfig, `npx tsc` either exits 1 with the help banner (typescript installed) or resolves an unrelated npm package (typescript not installed), both of which falsely indicate a broken setup.
