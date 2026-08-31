# claude-dev-plugin

Claude Code plugin marketplace for Elite Business Solutions. Three plugins, each installable on
its own.

| Plugin                           | What it ships                                                                                      | Install                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [elite-dev](plugins/elite-dev)   | Generic dev-workflow skills — git worktrees, GitHub issues, pull requests. Any TS/JS or .NET repo. | `claude plugin install elite-dev@elitebusinesssolutions`  |
| [elite-next](plugins/elite-next) | Shared skills and hooks for Next.js / TypeScript / .NET API projects.                              | `claude plugin install elite-next@elitebusinesssolutions` |
| [elite-ts](plugins/elite-ts)     | Shared lint/format hooks and formatting-setup/verification skills for TypeScript projects.         | `claude plugin install elite-ts@elitebusinesssolutions`   |

## Setup

Add the marketplace once, then install whichever plugin(s) you need:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-dev@elitebusinesssolutions
```

See each plugin's own README for what its skills do, and the root [CLAUDE.md](CLAUDE.md) for how
this repo is structured and how to contribute.
