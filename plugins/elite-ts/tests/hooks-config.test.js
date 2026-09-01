const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pluginRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function collectCommandHooks(configObj) {
  const out = [];
  const hooksRoot = configObj?.hooks ?? {};
  for (const eventName of Object.keys(hooksRoot)) {
    const groups = hooksRoot[eventName] ?? [];
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (hook?.type === "command") {
          out.push({ eventName, hook });
        }
      }
    }
  }
  return out;
}

function assertNodeHooksUseExecForm(commandHooks) {
  for (const { eventName, hook } of commandHooks) {
    if (hook.command === "node") {
      assert.ok(Array.isArray(hook.args), `Expected args array for node hook on ${eventName}`);
      assert.ok(hook.args.length >= 1, `Expected script path arg for node hook on ${eventName}`);
    }
  }
}

test("plugin hooks use documented node exec form", () => {
  const pluginHooks = readJson(path.join(pluginRoot, "hooks/hooks.json"));
  const commandHooks = collectCommandHooks(pluginHooks);
  assertNodeHooksUseExecForm(commandHooks);
});

test("project settings template uses documented node exec form", () => {
  const settings = readJson(path.join(repoRoot, ".claude/settings.json"));
  const commandHooks = collectCommandHooks(settings);
  assertNodeHooksUseExecForm(commandHooks);
});

// CLAUDE.md requires hooks/hooks.json (${CLAUDE_PLUGIN_ROOT}) and
// .claude/settings.json (${CLAUDE_PROJECT_DIR}) to stay structurally
// identical: same events, same matchers, same hook count/order, same
// timeout/statusMessage/type/command, and the same script path once the
// path-variable prefix is normalized away. Nothing else enforces this, so
// this test diffs the two trees field-by-field to catch silent drift.
function normalizeHookArgs(args) {
  return (Array.isArray(args) ? args : []).map((arg) =>
    typeof arg === "string"
      ? arg
          .replace(/^\$\{CLAUDE_PLUGIN_ROOT\}\//, "")
          .replace(/^\$\{CLAUDE_PROJECT_DIR\}\//, "")
          .replace(/^plugins\/[^/]+\//, "")
      : arg
  );
}

test("hooks/hooks.json and .claude/settings.json stay structurally in sync", () => {
  const pluginHooks = readJson(path.join(pluginRoot, "hooks/hooks.json"));
  const settings = readJson(path.join(repoRoot, ".claude/settings.json"));

  const pluginEvents = Object.keys(pluginHooks.hooks ?? {});
  const settingsEvents = Object.keys(settings.hooks ?? {});

  assert.deepStrictEqual(
    settingsEvents,
    pluginEvents,
    "hooks/hooks.json and .claude/settings.json must declare the same hook events, in the same order"
  );

  for (const eventName of pluginEvents) {
    const pluginGroups = pluginHooks.hooks[eventName] ?? [];
    const settingsGroups = settings.hooks[eventName] ?? [];

    assert.ok(
      Array.isArray(pluginGroups),
      `Expected hooks/hooks.json groups array for event "${eventName}"`
    );
    assert.ok(
      Array.isArray(settingsGroups),
      `Expected .claude/settings.json groups array for event "${eventName}"`
    );

    assert.strictEqual(
      settingsGroups.length,
      pluginGroups.length,
      `Mismatched number of hook groups for event "${eventName}"`
    );

    pluginGroups.forEach((pluginGroup, groupIndex) => {
      const settingsGroup = settingsGroups[groupIndex] ?? {};

      assert.strictEqual(
        settingsGroup.matcher,
        pluginGroup.matcher,
        `Mismatched matcher for event "${eventName}" group ${groupIndex}`
      );

      const pluginGroupHooks = pluginGroup.hooks ?? [];
      const settingsGroupHooks = settingsGroup.hooks ?? [];

      assert.strictEqual(
        settingsGroupHooks.length,
        pluginGroupHooks.length,
        `Mismatched number of hooks for event "${eventName}" group ${groupIndex}`
      );

      pluginGroupHooks.forEach((pluginHook, hookIndex) => {
        const settingsHook = settingsGroupHooks[hookIndex] ?? {};
        const label = `event "${eventName}" group ${groupIndex} hook ${hookIndex}`;

        assert.strictEqual(settingsHook.type, pluginHook.type, `Mismatched type for ${label}`);
        assert.strictEqual(
          settingsHook.command,
          pluginHook.command,
          `Mismatched command for ${label}`
        );
        assert.strictEqual(
          settingsHook.timeout,
          pluginHook.timeout,
          `Mismatched timeout for ${label}`
        );
        assert.strictEqual(
          settingsHook.statusMessage,
          pluginHook.statusMessage,
          `Mismatched statusMessage for ${label}`
        );
        assert.deepStrictEqual(
          normalizeHookArgs(settingsHook.args),
          normalizeHookArgs(pluginHook.args),
          `Mismatched args (ignoring \${CLAUDE_PLUGIN_ROOT}/\${CLAUDE_PROJECT_DIR} prefix) for ${label}`
        );
      });
    });
  }
});

// The sync test above only compares two strings against each other — it never asks whether
// either string resolves to a real file. This is the check that catches a hook path that
// points nowhere (the failure mode that let the two settings files silently stop dogfooding).
function resolveHookScriptPath(arg) {
  if (typeof arg !== "string") return null;
  if (arg.startsWith("${CLAUDE_PLUGIN_ROOT}/")) {
    return path.join(pluginRoot, arg.slice("${CLAUDE_PLUGIN_ROOT}/".length));
  }
  if (arg.startsWith("${CLAUDE_PROJECT_DIR}/")) {
    return path.join(repoRoot, arg.slice("${CLAUDE_PROJECT_DIR}/".length));
  }
  return null;
}

test("every configured hook script exists on disk", () => {
  const pluginHooks = readJson(path.join(pluginRoot, "hooks/hooks.json"));
  const settings = readJson(path.join(repoRoot, ".claude/settings.json"));

  const commandHooks = [...collectCommandHooks(pluginHooks), ...collectCommandHooks(settings)];

  let checked = 0;
  for (const { eventName, hook } of commandHooks) {
    for (const arg of hook.args ?? []) {
      const scriptPath = resolveHookScriptPath(arg);
      if (scriptPath === null) continue;
      checked += 1;
      assert.ok(
        fs.existsSync(scriptPath),
        `Hook script for event "${eventName}" does not exist: ${scriptPath}`
      );
    }
  }
  assert.ok(checked > 0, "Expected at least one hook script path to check");
});
