---
name: add-new-plugin
description: Add a brand-new plugin to this repo's marketplace (a new directory under plugins/, its own plugin.json, and a marketplace.json entry). Use when the user says "add a new plugin", "create a plugin called X", or similar.
---

Add a new plugin to this repo.

1. Create `plugins/<new-name>/.claude-plugin/plugin.json`, `plugins/<new-name>/skills/`,
   `plugins/<new-name>/README.md`, and `plugins/<new-name>/CLAUDE.md`. See the root
   [CLAUDE.md](../../../CLAUDE.md#pluginjson) for `plugin.json` field rules.
2. Add an entry for it to the root `.claude-plugin/marketplace.json` — see the root
   [CLAUDE.md](../../../CLAUDE.md#marketplacejson) for the rules (relative `source` path,
   `name` must match the plugin's own `plugin.json`).
3. If it needs npm tooling, add its path to the root `package.json`'s `workspaces` array and give
   it its own `package.json`.
4. Add a row for it to the root `README.md`'s plugin index.
5. Verify with `claude plugin validate` before opening a PR.
