# claude-dev-plugin

Generic dev-workflow skills for Claude Code: git worktrees, GitHub issue tracking, pull requests,
and PR review triage. Works with TypeScript/JavaScript or .NET projects — no framework assumptions
baked in beyond "this repo uses git and GitHub."

## Prerequisites

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated (`gh auth login`) — every
skill here shells out to it.

## Install

Add the marketplace:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
```

Then install the plugin:

```bash
claude plugin install elite-dev@elitebusinesssolutions
```

## Update

```bash
claude plugin marketplace update elitebusinesssolutions
claude plugin update elite-dev@elitebusinesssolutions
```

## Consumer project setup (recommended)

Running `claude plugin install` locally only configures your own machine. For a team project,
commit this to the project's own `.claude/settings.json` instead, so the plugin is declared for
everyone who opens the repo:

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
    "elite-dev@elitebusinesssolutions": true
  }
}
```

If the project doesn't have a `.claude/settings.json` yet, create it with just this content. If it
already has one, merge `extraKnownMarketplaces` and `enabledPlugins` in as additional top-level
keys — don't replace the file.

### Syncing plugins with sync-claude-plugins.ps1

[`sync-claude-plugins.ps1`](sync-claude-plugins.ps1) is a standalone PowerShell script you can copy
into any project that commits its plugin config to `.claude/settings.json` (not specific to this
plugin). Run it once when a developer starts on that project, and again any time
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

## Developing this plugin

To try a skill from this repo before it's released:

```bash
claude --plugin-dir .
```

then invoke it as `/elite-dev:<skill-name>` and run `/reload-plugins` after edits to pick up
changes without restarting.

**This only works from a plain terminal, not the VS Code extension** — the extension launches its
own managed `claude` process with no setting to pass `--plugin-dir`. Open a separate terminal to
develop against it.

## Skills

| Skill                    | Invoke                              | Purpose                                                                            |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `create-pr`              | `/elite-dev:create-pr`              | Open a PR with consistent body conventions and labels copied from the linked issue |
| `review-fix-pr-comments` | `/elite-dev:review-fix-pr-comments` | Triage and (on approval) fix unresolved PR review comments                         |
| `setup-worktree`         | `/elite-dev:setup-worktree`         | Set up or clean up a git worktree for a parallel dev session                       |
| `start-issue`            | `/elite-dev:start-issue`            | Mark a GitHub issue as started: assignee + project board status                    |

## Related

Stacked-PR workflows aren't bundled here — install GitHub's own tooling:
`gh extension install github/gh-stack` for the `gh stack` commands, and
`gh skill install github/gh-stack` for agent-native stack guidance
(docs: <https://github.com/github/gh-stack>).

## Project-local skills/hooks

Anything specific to a single project's own conventions (a project-specific board's node IDs, a
project-specific branch-naming rule) belongs in that project's own `CLAUDE.md` or `.claude/`
directory, not here — this repo stays generic across every project that installs it.
