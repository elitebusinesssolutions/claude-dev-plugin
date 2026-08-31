# claude-dev-plugin

Claude Code plugin marketplace for Elite Business Solutions. Two plugins, each installable on its
own.

| Plugin                         | What it ships                                                                                      | Install                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [elite-dev](plugins/elite-dev) | Generic dev-workflow skills — git worktrees, GitHub issues, pull requests. Any TS/JS or .NET repo. | `claude plugin install elite-dev@elitebusinesssolutions` |
| [elite-ts](plugins/elite-ts)   | Shared lint/format hooks and formatting-setup/verification skills for TypeScript projects.         | `claude plugin install elite-ts@elitebusinesssolutions`  |

Both plugins can also be used with
[GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing),
though its commands differ from the `claude` ones used below: install with
`copilot plugin install <plugin-name>@elitebusinesssolutions`. Copilot CLI has no `--plugin-dir`
equivalent for trying an unreleased local change — instead, install the local path directly
(`copilot plugin install ./plugins/<plugin-name>`), and reinstall after every edit; there is no
`/reload-plugins` equivalent to pick up a change mid-session.

See each plugin's own README for what its skills and hooks do, and the root
[CLAUDE.md](CLAUDE.md) for how this repo is structured and how to contribute.

## Install

This is the personal, one-machine install path. Run it once per machine per person; it doesn't
reach anyone else's setup — see [Consumer project setup](#consumer-project-setup-recommended)
below for the team-wide alternative.

Add the marketplace:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
```

Then install whichever plugin(s) you need, e.g.:

```bash
claude plugin install elite-dev@elitebusinesssolutions
```

## Update

```bash
claude plugin marketplace update elitebusinesssolutions
```

This refreshes the marketplace catalog only — follow it with
`claude plugin update <plugin-name>@elitebusinesssolutions` to actually pull the new version. This
manual pair always works regardless of whether `autoUpdate` is set anywhere; use it any time you
don't want to wait for the next automatic startup check, or to confirm an update actually landed.

## Consumer project setup (recommended)

Running `claude plugin install` locally only configures your own machine — it doesn't reach any of
your teammates', and each person has to repeat it themselves. For a team project, commit this to
the project's own `.claude/settings.json` instead, so the plugin is declared for everyone who
opens the repo:

```json
{
  "extraKnownMarketplaces": {
    "elitebusinesssolutions": {
      "source": {
        "source": "github",
        "repo": "elitebusinesssolutions/claude-dev-plugin"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "elite-dev@elitebusinesssolutions": true,
    "elite-ts@elitebusinesssolutions": true
  }
}
```

Paste one entry under `enabledPlugins` for each plugin the project wants — drop whichever it
doesn't need.

If the project doesn't have a `.claude/settings.json` yet, create it with just this content. If it
already has one — for anything, not just a plugin from here — merge `extraKnownMarketplaces` and
`enabledPlugins` in as additional top-level keys; don't replace the file. This repo's own
[`.claude/settings.json`](.claude/settings.json) is a working example of `enabledPlugins` sitting
alongside an unrelated `hooks` block.

This does **not** reliably auto-install the plugin — declaring it in `settings.json` only makes
Claude Code aware the project wants it. Trusting the folder is only evaluated through the
interactive trust dialog, and does nothing in headless/print mode (`-p`), including in CI. Once
installed, `autoUpdate: true` keeps that installation current without anyone manually running
`claude plugin marketplace update` — third-party marketplaces default to auto-update off.

### Syncing plugins with sync-claude-plugins.ps1

[`sync-claude-plugins.ps1`](sync-claude-plugins.ps1) is a standalone PowerShell script you can copy
into any project that commits its plugin config to `.claude/settings.json` (not specific to this
repo). Run it once when a developer starts on that project, and again any time
`.claude/settings.json` changes (a new plugin, a new marketplace, or after pulling someone else's
change to it):

```powershell
./sync-claude-plugins.ps1
```

It installs the Claude CLI if missing, registers/refreshes every marketplace listed under
`extraKnownMarketplaces`, and installs/updates every plugin listed under `enabledPlugins` — safe to
re-run any time, since installing/updating an already-current plugin is a no-op. Pass
`-SettingsPath` to point at a non-default location, `-Scope user` to install at user scope instead
of project scope, or `-DryRun` to print the commands it would run without executing them.

## Developing a plugin

To try a skill from this repo before it's released:

```bash
claude --plugin-dir plugins/<plugin-name>
```

then invoke it as `/<plugin-name>:<skill-name>` and run `/reload-plugins` after edits to pick up
changes without restarting.

**This only works from a plain terminal, not the VS Code extension.** The VS Code extension
launches its own managed `claude` process and has no setting to pass `--plugin-dir` (or any extra
CLI flag) to it. If you're working in the VS Code extension, open a separate integrated or
external terminal and run the command above there — it starts an independent CLI session, not the
extension's chat panel. The root [`.claude/settings.json`](.claude/settings.json) wires this
repo's own hook script up directly via `${CLAUDE_PROJECT_DIR}`, so unlike a skill loaded with
`--plugin-dir`, that hook runs in any session, including the VS Code extension, without needing
`--plugin-dir` at all.

## Related

Stacked-PR workflows aren't bundled here — install GitHub's own tooling:
`gh extension install github/gh-stack` for the `gh stack` commands, and
`gh skill install github/gh-stack` for agent-native stack guidance
(docs: <https://github.com/github/gh-stack>).

## Project-local skills and hooks

Anything specific to a single project's own conventions (a project-specific board's node IDs, a
project-specific branch-naming rule, a project-specific lint rule or hook) belongs in that
project's own `CLAUDE.md` or `.claude/` directory, not in a plugin here — every plugin in this
repo stays generic across every project that installs it.
