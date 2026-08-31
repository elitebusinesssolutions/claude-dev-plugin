// PreToolUse: block edits to the auto-generated API client, warn on editing a synced OpenAPI spec
const fs = require("fs");
const path = require("path");

// Projects on this stack have used more than one convention for where the
// OpenAPI codegen tool (openapi-typescript, orval, NSwag, etc.) writes its
// generated client/types — add new ones here as they show up:
//   - filename suffix convention: anything ending in .gen.ts / .generated.ts
//   - dedicated output directory: src/lib/api/generated/**, lib/api/generated/**
//   - openapi-typescript default: src/lib/api/schema.d.ts (matched by filename
//     alone, since `schema.d.ts` is distinctive enough not to collide with
//     unrelated types files)
const GENERATED_CLIENT_PATTERNS = [
  /\.gen\.tsx?$/,
  /\.generated\.tsx?$/,
  /[/\\]api[/\\]generated[/\\]/,
  /schema\.d\.ts$/
];

function isGeneratedClientFile(f) {
  return GENERATED_CLIENT_PATTERNS.some((re) => re.test(f));
}

try {
  const d = JSON.parse(fs.readFileSync(0, "utf8"));
  const f = d?.tool_input?.file_path;
  if (!f) process.exit(0);

  // Hard block: auto-generated API client/types from the .NET API's OpenAPI spec
  if (isGeneratedClientFile(f)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            `${f} is auto-generated from the .NET API's OpenAPI spec — do not edit by hand.\n\n` +
            "Regenerate it after the API contract changes, e.g.:\n" +
            "  npx openapi-typescript <openapi-url-or-file> -o " +
            `${f}\n  # or re-run whatever codegen script this project uses (check package.json)`
        }
      })
    );
    process.exit(0);
  }

  // Soft warn: editing a locally-synced copy of the OpenAPI spec
  if (/openapi\.(json|ya?ml)$/.test(f) && fs.existsSync(f)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            `Editing ${path.basename(f)} by hand is risky — this file is normally fetched/copied from ` +
            `the .NET API and will be overwritten the next time it's re-synced, silently discarding this edit.\n\n` +
            "The API contract should change on the .NET side first, then be re-synced here. " +
            `Proceed with editing ${path.basename(f)} anyway?`
        }
      })
    );
    process.exit(0);
  }
} catch (err) {
  process.stderr.write(`protect-generated.js: skipping — ${err.message}\n`);
  process.exit(0);
}
