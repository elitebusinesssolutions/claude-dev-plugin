const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runHook } = require("./helpers/run-hook");

function run(input) {
  return runHook("protect-generated.js", input);
}

test("no file_path in tool_input -> silent pass-through", () => {
  const r = run({ tool_input: {} });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("tool_input missing entirely -> silent pass-through", () => {
  const r = run({});
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("editing a .gen.ts file is denied", () => {
  const r = run({
    tool_name: "Edit",
    tool_input: { file_path: "src/lib/api/orders.gen.ts" }
  });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny", r.stdout);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /auto-generated/);
});

test(".generated.ts deny also matches Windows-style backslash paths", () => {
  const r = run({
    tool_name: "Write",
    tool_input: {
      file_path: "C:\\project\\src\\lib\\api\\client.generated.ts"
    }
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
});

test("editing a file under api/generated/ is denied", () => {
  const r = run({
    tool_name: "Edit",
    tool_input: { file_path: "src/lib/api/generated/index.ts" }
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny", r.stdout);
  assert.match(out.hookSpecificOutput.permissionDecisionReason, /auto-generated/);
  assert.match(
    out.hookSpecificOutput.permissionDecisionReason,
    /src\/lib\/api\/generated\/index\.ts/
  );
});

test("schema.d.ts is denied regardless of directory nesting", () => {
  const r = run({
    tool_name: "Write",
    tool_input: { file_path: "src/lib/api/generated/schema.d.ts" }
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
});

test("an unrelated top-level types.ts is not treated as generated", () => {
  const r = run({
    tool_name: "Edit",
    tool_input: { file_path: "src/types.ts" }
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("editing an existing openapi.json spec file asks for confirmation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elite-next-hook-test-"));
  const specFile = path.join(dir, "openapi.json");
  fs.writeFileSync(specFile, "{}\n");

  try {
    const r = run({
      tool_name: "Edit",
      tool_input: { file_path: specFile }
    });
    const out = JSON.parse(r.stdout);
    assert.equal(out.hookSpecificOutput.permissionDecision, "ask");
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /overwritten/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a new (not-yet-created) openapi.yaml file is not warned about", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elite-next-hook-test-"));
  const specFile = path.join(dir, "openapi.yaml");
  try {
    const r = run({
      tool_name: "Write",
      tool_input: { file_path: specFile, content: "openapi: 3.0.0" }
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-spec, non-generated file passes through silently", () => {
  const r = run({
    tool_name: "Edit",
    tool_input: { file_path: "src/components/Button.tsx" }
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("malformed JSON on stdin does not crash the hook", () => {
  const r = run("not valid json");
  assert.notEqual(r.status, 2, "must not use the blocking exit code");
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /protect-generated\.js: skipping/);
});

test("empty stdin does not crash the hook", () => {
  const r = run("");
  assert.notEqual(r.status, 2);
  assert.equal(r.stdout, "");
});
