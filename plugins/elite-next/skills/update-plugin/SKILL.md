---
name: update-plugin
description: Update the installed elite-next plugin to the latest published version from the elite-next-marketplace — use when the user asks to update the plugin, get the latest skills/hooks, or check for plugin updates.
---

Update the `elite-next` plugin (this plugin, once installed in a consumer project) to the newest version published on the `elite-next-marketplace` marketplace.

## Step 1 — Check whether autoUpdate is already handling this

Look for an `extraKnownMarketplaces.elite-next-marketplace.autoUpdate` field set to `true` in the project's `.claude/settings.json` (this is what the `claude-next-plugin` README's "Consumer project setup" section recommends). If it's already `true`:

- Claude Code refreshes the marketplace and updates the installed plugin automatically at every startup — no manual command is required, for this update or future ones. This assumes the plugin was actually installed at some point already; `autoUpdate` keeps an existing install current, it doesn't perform the initial install (see the caveats in `${CLAUDE_PLUGIN_ROOT}/README.md` on why the initial `enabledPlugins`-triggered install isn't reliable on its own — if `claude plugin list` shows the plugin isn't installed at all yet, that's the gap to fix, not this one).
- Tell the user that once they (and their teammates, if project-scoped) pull the merged change and restart Claude Code, the update applies on its own.
- Only run the manual commands below if the user wants the update to apply immediately, without waiting for the next startup.

Before telling the user "no action needed," confirm the version bump actually reached `main` — don't take "we merged the PR" at face value if the branch isn't stated. The marketplace source tracks this repo's default branch (`main`) specifically; a bump merged only to a feature branch, or still sitting in an open PR, is invisible to `autoUpdate` (and to a manual refresh) no matter how confidently the user describes it as done. If the branch isn't clear from what they said, check `.claude-plugin/plugin.json`'s `version` field on `main` directly, or ask.

If `autoUpdate` isn't set — or there's no `extraKnownMarketplaces` entry for `elite-next-marketplace` at all — continue with the manual steps, and see Step 3 for adding it going forward.

## Step 2 — Refresh the marketplace catalog

```bash
claude plugin marketplace update elite-next-marketplace
```

This pulls the latest commit from the default branch (`main`) so the local catalog knows about any version bump in `plugin.json`.

## Step 3 — Determine scope

Ask the user (if not already stated) whether the update should apply to just them or the whole team:

- **`user`** (default) — updates the plugin for the current user only. Nothing shared, nothing committed.
- **`project`** — writes `enabledPlugins`/`extraKnownMarketplaces` into the project's checked-in `.claude/settings.json`, so that anyone who opens the repo _from then on_ has the marketplace registered and the plugin enabled automatically.

**Neither scope actually pushes the update to teammates' machines, unless `autoUpdate` is set (Step 1).** A plugin install/update always writes to the _current user's_ local `~/.claude` plugin cache — that part never leaves this machine, regardless of scope. Project scope only commits which plugin/marketplace _should_ be enabled; without `autoUpdate: true` on the marketplace entry, it doesn't and can't force anyone else's Claude Code to pull the new version — each teammate still has to, on their own machine, pull the branch/commit and run `claude plugin marketplace update elite-next-marketplace` themselves. If you're setting up project scope and `autoUpdate` isn't set yet, add `"autoUpdate": true` to the `extraKnownMarketplaces.elite-next-marketplace` entry while you're at it (see `${CLAUDE_PLUGIN_ROOT}/README.md`) — it closes this gap for every future update, not just this one.

## Step 4 — Update the plugin

```bash
claude plugin update elite-next@elite-next-marketplace
```

Add `--scope project` if Step 3 resolved to project scope:

```bash
claude plugin update elite-next@elite-next-marketplace --scope project
```

If this used project scope, the `.claude/settings.json` change still needs to be committed and pushed like any other change (branch, commit, PR — see `/elite-next:git-workflow`) before it reaches teammates at all. Once merged: if `autoUpdate` is set, teammates get it automatically at their next startup; otherwise, tell them to run `claude plugin marketplace update elite-next-marketplace` on their own machines — committing the config alone doesn't do that for them.

## Step 5 — Verify

```bash
claude plugin list
```

Confirm the `elite-next` entry's version matches the current `version` field in this repo's `.claude-plugin/plugin.json` on `main`. If it doesn't, the marketplace catalog may not have refreshed yet — re-run Step 2.

## Step 6 — Reload if mid-session

If the user is running this inside an active session that already has the plugin loaded:

```shell
/reload-plugins
```

## Troubleshooting

**Update reports no newer version available:**

> Either the marketplace catalog is stale (re-run `claude plugin marketplace update elite-next-marketplace`) or no version bump has been merged to `main` yet. Check `.claude-plugin/plugin.json`'s `version` field directly on the `main` branch of the repo.

**`claude plugin update` fails with "plugin not found":**

> The marketplace isn't registered locally yet. Run `claude plugin marketplace add elitebusinesssolutions/claude-next-plugin` first, then retry.
