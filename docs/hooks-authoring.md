# Hooks authoring

Reference: [Hooks](https://code.claude.com/docs/en/hooks)

One copy of the hook mechanics, shared by every plugin in this repo that ships hooks. A plugin's
own `CLAUDE.md` covers only what is specific to that plugin (its own hook list, its own guard
conditions) — check it before writing a new hook there.

---

## `hooks.json` format

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "ToolName|OtherTool",
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.js"],
            "timeout": 30,
            "statusMessage": "Running check..."
          }
        ]
      }
    ]
  }
}
```

## Path resolution — use `${CLAUDE_PLUGIN_ROOT}`

Always reference hook scripts using the `${CLAUDE_PLUGIN_ROOT}` path placeholder in `args`:

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.js"]
}
```

This resolves to the plugin's installation directory at runtime. Do not hardcode
`~/.claude/plugins/cache/...` paths or use PowerShell globs to find scripts — those are fragile
workarounds. The exec form (`args` array) avoids shell tokenization and quoting issues on
Windows, and is preferred by the official docs for hooks with path variables.

## Never declare the standard hooks file

`hooks/hooks.json` loads automatically — a plugin's `plugin.json` must not name it again in its
own `hooks` field. Doing so makes Claude Code report `Duplicate hooks file detected: ${ht}
resolves to already-loaded file ${dn}` and fail the whole plugin load. Reserve the manifest
`hooks` field for an _additional_ hooks file beyond the standard one; omit it otherwise.

## Keep `hooks/hooks.json` and the root `.claude/settings.json` in sync

The root `.claude/settings.json` exists solely so this repo dogfoods its own hooks while you
develop them — it is never shipped to or read by a consumer project (a consumer only gets a
plugin's `hooks/hooks.json`, via that plugin's `plugin.json`). For each hook a plugin ships, the
two files must stay structurally identical: same events, same matchers, same script list, same
order, same `timeout`/`statusMessage` — the **only** difference is the path variable, and the
root settings file's path also carries the plugin's own directory segment:

| File                              | Path                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `plugins/<name>/hooks/hooks.json` | `${CLAUDE_PLUGIN_ROOT}/hooks/<script>.js`                |
| Root `.claude/settings.json`      | `${CLAUDE_PROJECT_DIR}/plugins/<name>/hooks/<script>.js` |

Whenever you add, remove, or change a hook entry in a plugin's `hooks/hooks.json` (new script,
changed matcher, changed timeout), make the identical edit in the root `.claude/settings.json`,
swapping only the path. `plugins/elite-ts/tests/hooks-config.test.js` diffs the two trees
field-by-field and asserts every script path resolves to a real file on disk — this is what
enforces the sync; `claude plugin validate` only checks a plugin's own `hooks/hooks.json` and does
not know the root settings file exists.

Before that existence assertion existed, the two files drifted silently: the root settings file
kept pointing `format.js` at a path under a plugin directory that had moved, the sync test still
passed because it only compared two strings against each other, and the repo silently stopped
dogfooding its own hook until someone noticed by hand.

## Exit codes — the contract

| Exit code     | Meaning            | Effect                                                  |
| ------------- | ------------------ | ------------------------------------------------------- |
| `0`           | Success            | Parse stdout for optional JSON control output           |
| `2`           | Blocking error     | Prevent the action; send stderr to Claude as the reason |
| Anything else | Non-blocking error | Log the error, continue normally                        |

Exit 2 is the correct code to block a tool call. Never exit 1 to block — that's a non-blocking
error that logs and continues.

## Stdin protocol

Every hook receives the full event payload as JSON on stdin. Parse it with
`fs.readFileSync(0, 'utf8')` (synchronous) or the async equivalent. Key fields always present:

```json
{
  "session_id": "...",
  "cwd": "/path/to/project",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "...", "content": "..." }
}
```

For `Write` and `Edit`, `tool_input.file_path` is the file being written.

## Structured JSON output (exit 0)

To provide richer control than exit codes alone, write JSON to stdout on exit 0:

```json
{
  "continue": true,
  "systemMessage": "Warning: this file looks auto-generated",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Explain why the tool call needs a second look"
  }
}
```

For `PreToolUse`, set `permissionDecision` to `"allow"`, `"deny"`, or `"ask"`. For `PostToolUse`,
set `"decision": "block"` to prevent Claude from proceeding after a write. For `Stop`, set
`"decision": "block"` with a `reason` to prevent the session from ending.

## Matchers

The `matcher` field controls which tool events fire the hook:

| Syntax                              | How it's evaluated                                       |
| ----------------------------------- | -------------------------------------------------------- |
| `"Write\|Edit"`                     | Exact string match on tool name — fires on Write OR Edit |
| Any string with non-word characters | JavaScript regex                                         |
| `"*"` or omitted                    | Fires on all tools                                       |

`"Write|Edit"` uses exact match — the `|` is the OR operator for the plain-string syntax, not
regex. Use `"Write\|Edit\|Bash"` to add more tools. To match MCP tools, use regex:
`"mcp__memory__.*"`.

## Timeouts

Default timeout for command hooks is 600 seconds. Set shorter timeouts for hooks that should fail
fast:

```json
{ "timeout": 10 }
{ "timeout": 30 }
```

Keep `PreToolUse` and `PostToolUse` hooks short — they run in the middle of a tool call and the
user is waiting. A `Stop` hook may safely use a long timeout, since it runs after Claude finishes
responding, not during a tool call.

## Hook script guidelines

1. **Read stdin completely before doing anything.** Use `fs.readFileSync(0, 'utf8')` or the async
   stream pattern.
2. **Exit 2 + write to stderr** to block and explain:
   `process.stderr.write('Reason\n'); process.exit(2);`
3. **Exit 0 silently** if there's nothing to report — don't emit noise on every write.
4. **Keep `PreToolUse` hooks fast** (≤10s). They block the tool call and the user is waiting.
5. **Don't spawn heavy processes in `PreToolUse`.** Linting belongs in `PostToolUse`.
6. **Write to stderr for user-visible messages, stdout for JSON control output.** Mixing them
   breaks JSON parsing.
7. **No `console.log` in hook scripts.** Use `process.stderr.write()` for diagnostics and
   `process.stdout.write(JSON.stringify(...))` for structured output.
8. **Guard against project shapes that don't apply.** A hook that depends on a tool being
   installed (ESLint, Prettier, tsc) should check for that tool first and skip cleanly when it's
   absent, rather than reporting a spurious failure on every write.

## Hook events reference

| Event              | When                             | Blockable                                    |
| ------------------ | -------------------------------- | -------------------------------------------- |
| `PreToolUse`       | Before a tool executes           | Yes (exit 2 or `permissionDecision: "deny"`) |
| `PostToolUse`      | After a tool succeeds            | Yes (`"decision": "block"`)                  |
| `Stop`             | After Claude finishes responding | Yes (prevents stopping)                      |
| `SessionStart`     | New or resumed session           | No                                           |
| `UserPromptSubmit` | User submits a message           | Yes (exit 2 rejects the prompt)              |

Adding a new hook event? Check the
[full event list](https://code.claude.com/docs/en/hooks#hook-events) first — there are 20+
events.

## Adding a new hook checklist

- [ ] Hook script reads full stdin before processing (`fs.readFileSync(0, 'utf8')`)
- [ ] Hook uses `${CLAUDE_PLUGIN_ROOT}` in `hooks.json` via exec form (`args` array)
- [ ] Fast checks (≤10s) go in `PreToolUse`; slow checks go in `PostToolUse` or `Stop`
- [ ] Exit 2 + stderr for blocking; exit 0 for pass
- [ ] No `console.log` — use `process.stderr.write` or JSON stdout
- [ ] Timeout is set appropriately in `hooks.json`
- [ ] Test by piping JSON to the script directly
- [ ] Top-level logic is wrapped in try/catch so malformed/unexpected input exits clean instead of
      crashing uncaught
- [ ] Mirror the new/changed hook entry in the root `.claude/settings.json` (see
      [Keep hooks/hooks.json and the root .claude/settings.json in sync](#keep-hookshooksjson-and-the-root-claudesettingsjson-in-sync))
- [ ] Add `tests/<hook-name>.test.js` covering the normal path, guard clauses, and malformed
      input; run `npm test`
- [ ] Bump `PATCH` version in that plugin's `plugin.json`
