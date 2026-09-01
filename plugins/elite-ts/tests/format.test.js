const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runHook } = require("./helpers/run-hook");

// format.js resolves eslint/prettier's bin *script* via package.json's "bin"
// field (see hooks/format.js) and spawns it with node directly, so a fixture
// "install" is a node_modules/<name>/package.json plus a bin script. Each
// stub package's bin script just requires a dedicated per-tool stub script
// controlled by STUB_ESLINT_*/STUB_PRETTIER_* env vars — one stub script per
// tool, because a direct-script spawn's argv is just the tool's own args
// (e.g. ["--fix", "src/foo.ts"]), not a tool name to switch on.
const STUB_ESLINT_JS = path.join(__dirname, "helpers", "stub-bin", "stub-eslint.js");
const STUB_PRETTIER_JS = path.join(__dirname, "helpers", "stub-bin", "stub-prettier.js");

function writeStubPackage(pkgDir, name, stubJsPath) {
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name, bin: { [name]: "bin.js" } })
  );
  fs.writeFileSync(path.join(pkgDir, "bin.js"), `require(${JSON.stringify(stubJsPath)});\n`);
}

// format.js only invokes eslint/prettier if node_modules/<tool>/package.json
// resolves to a bin script starting from the edited file's own directory (or
// a parent of it — see the monorepo fixtures below) — this fixture simulates
// either or both being a project devDependency. When `nested` is set,
// node_modules lives at the fixture root but `fn` is invoked with a
// sub-package directory (no node_modules of its own) as cwd, simulating an
// npm/yarn/pnpm workspace where eslint/prettier are hoisted to the root. When
// `subPackageLocal` is set, node_modules instead lives only under
// `packages/sub` and `fn` is invoked with the fixture root as cwd, simulating
// a sub-package with its own local install while Claude's session cwd is
// elsewhere in the workspace. `brokenPrettier` simulates a package.json whose
// bin field points at a missing script (e.g. a corrupt install) instead of a
// working stub.
function withProject(
  {
    eslint = false,
    prettier = false,
    brokenPrettier = false,
    nested = false,
    subPackageLocal = false
  } = {},
  fn
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elite-ts-hook-test-"));
  const nodeModulesRoot = subPackageLocal
    ? path.join(dir, "packages", "sub", "node_modules")
    : path.join(dir, "node_modules");
  fs.mkdirSync(nodeModulesRoot, { recursive: true });
  if (eslint) writeStubPackage(path.join(nodeModulesRoot, "eslint"), "eslint", STUB_ESLINT_JS);
  if (prettier)
    writeStubPackage(path.join(nodeModulesRoot, "prettier"), "prettier", STUB_PRETTIER_JS);
  if (brokenPrettier) {
    // package.json exists and names a bin script, but the script itself was
    // never written — simulates a corrupt/incomplete install.
    const pkgDir = path.join(nodeModulesRoot, "prettier");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "prettier", bin: { prettier: "bin.js" } })
    );
  }
  let cwd = dir;
  if (nested) {
    cwd = path.join(dir, "packages", "sub");
    fs.mkdirSync(cwd, { recursive: true });
  }
  try {
    return fn(cwd);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function withEslintProject(fn) {
  return withProject({ eslint: true, prettier: true }, fn);
}

function run(input, env, cwd) {
  return runHook("format.js", input, { env, cwd });
}

test("no file_path -> silent pass-through", () => {
  const r = run({ tool_input: {} });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("clean eslint (0) + clean prettier (0) on a .ts file -> no output", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      { STUB_ESLINT_STATUS: "0", STUB_PRETTIER_STATUS: "0" },
      cwd
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });
});

test("eslint exit 1 (unfixable lint warnings) is expected and not reported", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "1",
        STUB_ESLINT_STDOUT: "1 warning",
        STUB_PRETTIER_STATUS: "0"
      },
      cwd
    );
    assert.equal(r.stdout, "");
  });
});

test("eslint exit 2 (fatal config error) is reported", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "2",
        STUB_ESLINT_STDERR: "ESLint couldn't find a configuration file",
        STUB_PRETTIER_STATUS: "0"
      },
      cwd
    );
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /ESLint did not run on foo\.ts/);
    assert.match(out.hookSpecificOutput.additionalContext, /couldn't find a configuration/);
  });
});

test("non-JS/TS files skip eslint entirely but still run prettier", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "README.md" } },
      { STUB_ESLINT_STATUS: "2", STUB_PRETTIER_STATUS: "0" },
      cwd
    );
    // eslint would have "failed" (status 2) if it had been invoked at all — since
    // it wasn't (README.md isn't JS/TS), there must be no eslint message.
    assert.equal(r.stdout, "");
  });
});

test(".mts and .cts files DO trigger eslint (Node ESM/CJS TS entrypoints)", () => {
  withEslintProject((cwd) => {
    for (const file of ["vite.config.mts", "vite.config.cts"]) {
      const r = run(
        { tool_name: "Write", tool_input: { file_path: file } },
        {
          STUB_ESLINT_STATUS: "2",
          STUB_ESLINT_STDERR: "ESLint couldn't find a configuration file",
          STUB_PRETTIER_STATUS: "0"
        },
        cwd
      );
      const out = JSON.parse(r.stdout);
      assert.match(
        out.hookSpecificOutput.additionalContext,
        new RegExp(`ESLint did not run on ${file.replace(/\./g, "\\.")}`)
      );
    }
  });
});

test("project without eslint installed skips eslint silently (no false failure)", () => {
  // No node_modules/eslint fixture here — simulates a project that just
  // doesn't use ESLint. Even though the stub is configured to "fail", it must
  // never be invoked, so there must be no eslint message.
  const r = run(
    { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
    { STUB_ESLINT_STATUS: "2", STUB_PRETTIER_STATUS: "0" }
  );
  assert.equal(r.stdout, "");
});

test("prettier failure is reported", () => {
  withProject({ prettier: true }, (cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "0",
        STUB_PRETTIER_STATUS: "1",
        STUB_PRETTIER_STDERR: "[error] src/foo.ts: SyntaxError"
      },
      cwd
    );
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /Prettier error on foo\.ts/);
  });
});

test("project without prettier installed skips prettier silently (no false failure)", () => {
  // No node_modules/prettier fixture here — simulates a project that just
  // doesn't use prettier. Even though the stub is configured to "fail", it must
  // never be invoked, so there must be no prettier message.
  const r = run(
    { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
    { STUB_ESLINT_STATUS: "0", STUB_PRETTIER_STATUS: "1" }
  );
  assert.equal(r.stdout, "");
});

test("both eslint and prettier failures are combined into one JSON payload", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      { STUB_ESLINT_STATUS: "2", STUB_PRETTIER_STATUS: "1" },
      cwd
    );
    // Must be exactly one parseable JSON object, not two concatenated ones.
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /ESLint did not run/);
    assert.match(out.hookSpecificOutput.additionalContext, /Prettier error/);
  });
});

// Regression test for the bug this suite was written to catch: when eslint IS
// a project dependency but the underlying invocation breaks for a reason that
// isn't ESLint's own "0 clean / 1 found issues / 2 fatal" contract (e.g. npx
// resolving to a broken/incompatible binary), the old `status === 2` check
// silently ignored any other exit code, so the failure was never surfaced.
test("eslint failing with a non-standard exit code is still reported", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "127",
        STUB_ESLINT_STDERR: "eslint: command not found",
        STUB_PRETTIER_STATUS: "0"
      },
      cwd
    );
    const out = JSON.parse(r.stdout);
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /ESLint did not run on foo\.ts \(exit 127\)/
    );
  });
});

// Regression coverage for the direct-bin-spawn change (was previously "npx
// entirely missing from PATH still surfaces a prettier failure" — that
// scenario no longer applies now that format.js spawns the resolved bin path
// directly instead of `npx prettier`, so PATH contents don't matter anymore).
// What still matters: if node_modules/prettier resolves via package.json but isn't a valid,
// executable binary (e.g. a corrupt install), the hook must still report a
// failure rather than silently doing nothing.
test("prettierBin exists but is broken (non-executable) -> still surfaces a failure", () => {
  withProject({ brokenPrettier: true }, (cwd) => {
    const result = runHook(
      "format.js",
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      { cwd }
    );
    assert.notEqual(result.stdout, "", "expected a failure to be reported");
    const out = JSON.parse(result.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /Prettier error/);
  });
});

test("malformed JSON on stdin does not crash the hook", () => {
  const r = run("{ not json");
  assert.notEqual(r.status, 2);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /format\.js: skipping/);
});

// Regression test for issue #5: in an npm/yarn/pnpm workspace, eslint/prettier
// are typically hoisted to the workspace root's node_modules only. If the
// hook's cwd is a sub-package directory with no node_modules of its own, the
// bin-existence gate must still find them by walking up to the workspace root
// — otherwise linting/formatting is silently skipped for the whole sub-package.
test("monorepo: eslint hoisted to workspace root is still found from a nested sub-package cwd", () => {
  withProject({ eslint: true, prettier: true, nested: true }, (cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "2",
        STUB_ESLINT_STDERR: "ESLint couldn't find a configuration file",
        STUB_PRETTIER_STATUS: "0"
      },
      cwd
    );
    // If the gate failed to find the hoisted bin, eslint would never have been
    // invoked at all, so there'd be no output here — the presence of this
    // message proves the hoisted binary was detected and npx eslint ran.
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /ESLint did not run on foo\.ts/);
  });
});

test("monorepo: prettier hoisted to workspace root is still found from a nested sub-package cwd", () => {
  withProject({ eslint: true, prettier: true, nested: true }, (cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "0",
        STUB_PRETTIER_STATUS: "1",
        STUB_PRETTIER_STDERR: "[error] src/foo.ts: SyntaxError"
      },
      cwd
    );
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /Prettier error on foo\.ts/);
  });
});

// Inverse of the hoisted-to-root case above: a sub-package carries its OWN
// eslint/prettier install (not hoisted to the workspace root) while Claude's
// session cwd is the workspace root. The search must start from the edited
// file's own directory, not the session cwd, or it walks straight up from the
// root and never finds the sub-package's local install.
test("monorepo: sub-package's own local install is found even when session cwd is the workspace root", () => {
  withProject({ eslint: true, prettier: true, subPackageLocal: true }, (cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "packages/sub/src/foo.ts" } },
      {
        STUB_ESLINT_STATUS: "2",
        STUB_ESLINT_STDERR: "ESLint couldn't find a configuration file",
        STUB_PRETTIER_STATUS: "0"
      },
      cwd
    );
    // If the search had started at session cwd (the workspace root, which has
    // no node_modules of its own here), eslint would never have been found or
    // invoked, so there'd be no output here.
    const out = JSON.parse(r.stdout);
    assert.match(out.hookSpecificOutput.additionalContext, /ESLint did not run on foo\.ts/);
  });
});

// Don't regress the simple (non-monorepo) case: a cwd with its own
// node_modules/eslint must keep working exactly as before.
test("monorepo fix does not regress a project with its own local node_modules", () => {
  withEslintProject((cwd) => {
    const r = run(
      { tool_name: "Write", tool_input: { file_path: "src/foo.ts" } },
      { STUB_ESLINT_STATUS: "0", STUB_PRETTIER_STATUS: "0" },
      cwd
    );
    assert.equal(r.stdout, "");
  });
});

// Regression test: format.js used to pass shell: true unconditionally to both
// spawnSync calls, so a file_path containing shell metacharacters was parsed
// by a shell instead of passed through as one literal argument (on Windows,
// by cmd.exe). It now spawns each tool's resolved bin script directly with
// node (see hooks/format.js), which needs no shell on any platform — so a
// metacharacter in file_path must not run a second command anywhere.
test("a shell metacharacter in file_path is not interpreted by a shell", () => {
  withEslintProject((cwd) => {
    const injectedMarker = path.join(cwd, "injected");
    const maliciousPath = `src/foo.ts; touch ${injectedMarker} #.ts`;
    run(
      { tool_name: "Write", tool_input: { file_path: maliciousPath } },
      { STUB_ESLINT_STATUS: "0", STUB_PRETTIER_STATUS: "0" },
      cwd
    );
    assert.equal(
      fs.existsSync(injectedMarker),
      false,
      "file_path's shell metacharacters must not run a second command"
    );
  });
});
