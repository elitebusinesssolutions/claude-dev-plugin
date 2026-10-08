# claude-dev-plugin

Claude Code plugin marketplace for Elite Business Solutions. Two plugins, each installable on its own.

| Plugin | What it ships | Install |
| --- | --- | --- |
| [elite-dev](plugins/elite-dev) | Generic dev-workflow skills — git worktrees, GitHub issues, pull requests, Azure Key Vault dev secrets, dev machine setup, plus a pinned context-usage line. Any TS/JS or .NET repo. | `claude plugin install elite-dev@elitebusinesssolutions` |
| [elite-ts](plugins/elite-ts) | Shared lint/format hooks and formatting-setup/verification skills for TypeScript projects. | `claude plugin install elite-ts@elitebusinesssolutions` |

Both plugins can also be used with [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing), though its commands differ from the `claude` ones used below: install with `copilot plugin install <plugin-name>@elitebusinesssolutions`. Copilot CLI has no `--plugin-dir` equivalent for trying an unreleased local change — instead, install the local path directly (`copilot plugin install ./plugins/<plugin-name>`), and reinstall after every edit; there is no `/reload-plugins` equivalent to pick up a change mid-session.

See each plugin's own README for what its skills and hooks do, and the root [CLAUDE.md](CLAUDE.md) for how this repo is structured and how to contribute.

## Install

This is the personal, one-machine install path. Run it once per machine per person; it doesn't reach anyone else's setup — see [Consumer project setup](#consumer-project-setup-recommended) below for the team-wide alternative.

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

This refreshes the marketplace catalog only — follow it with `claude plugin update <plugin-name>@elitebusinesssolutions` to actually pull the new version. This manual pair always works regardless of whether `autoUpdate` is set anywhere; use it any time you don't want to wait for the next automatic startup check, or to confirm an update actually landed.

## Developer machine setup

Run [`setup.ps1`](setup.ps1) from a PowerShell terminal at the repo root:

```powershell
./setup.ps1
```

The script asks for elevation through a UAC prompt and continues in an elevated window. Run it from a local administrator account: the elevated window runs as the account that approves the prompt, so GitHub sign-in, Claude plugins, and npm packages land in that account's profile. It is safe to run again: it skips every tool and step that is already done.

It installs:

- nvm for Windows and Node 20
- The GitHub CLI, and signs in to GitHub
- The Claude CLI
- The baseline Claude plugins and marketplaces, in user scope
- The ASD-STE100 skill
- The npm packages of this repo, with `npm ci`

The script asks before it runs a remote installer (the Claude CLI) or `npx` (the ASD-STE100 skill). When you decline, or a step cannot finish, the script lists the manual step in its summary, for example restarting Claude Code after a plugin update.

## Developing a plugin

To try a skill from this repo before it's released:

```bash
claude --plugin-dir plugins/<plugin-name>
```

then invoke it as `/<plugin-name>:<skill-name>` and run `/reload-plugins` after edits to pick up changes without restarting.

**This only works from a plain terminal, not the VS Code extension.** The VS Code extension launches its own managed `claude` process and has no setting to pass `--plugin-dir` (or any extra CLI flag) to it. If you're working in the VS Code extension, open a separate integrated or external terminal and run the command above there — it starts an independent CLI session, not the extension's chat panel. The root [`.claude/settings.json`](.claude/settings.json) wires this repo's own hook script up directly via `${CLAUDE_PROJECT_DIR}`, so unlike a skill loaded with `--plugin-dir`, that hook runs in any session, including the VS Code extension, without needing `--plugin-dir` at all.

## Releases

Each plugin releases independently. Bumping a plugin's `version` field in its own `plugins/<name>/.claude-plugin/plugin.json` and merging that to `main` is what triggers a release — there is no separate manual release step.

[`.github/workflows/release.yml`](.github/workflows/release.yml) runs on every push to `main` that touches a `plugin.json`. For each plugin whose version changed since the previous commit, it:

1. Creates a git tag `<plugin-name>-v<version>` (e.g. `elite-dev-v0.5.0`).
2. Creates a GitHub Release for that tag, with an auto-generated title and release notes (GitHub's native `--generate-notes`, started from that plugin's own prior tag rather than the other plugin's most recent one). This bounds the _commit range_ the notes are generated from, not which plugin each merged PR touched — a PR that only changed the other plugin can still appear in the list if it merged inside that range.

The workflow can also be run manually from the Actions tab (`workflow_dispatch`) — useful to retry a plugin whose tag got pushed but whose Release creation failed, since it's safe to re-run.

A push that doesn't change any `plugin.json` version is a no-op — no tag, no release.

## Related

Stacked-PR workflows aren't bundled here — install GitHub's own tooling: `gh extension install github/gh-stack` for the `gh stack` commands, and `gh skill install github/gh-stack` for agent-native stack guidance (docs: <https://github.com/github/gh-stack>).

## Project-local skills and hooks

Anything specific to a single project's own conventions (a project-specific board's node IDs, a project-specific branch-naming rule, a project-specific lint rule or hook) belongs in that project's own `CLAUDE.md` or `.claude/` directory, not in a plugin here — every plugin in this repo stays generic across every project that installs it.
