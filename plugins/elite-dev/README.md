# elite-dev

Generic dev-workflow skills for Claude Code: git worktrees, GitHub issue tracking, pull requests,
PR review triage, Azure Key Vault setup for local dev secrets, and a Windows developer machine setup script.

```bash
claude plugin install elite-dev@elitebusinesssolutions
```

## Skills

| Skill                    | Invoke                              | Purpose                                                                              |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `create-pr`              | `/elite-dev:create-pr`              | Open a PR: suggest a review, flag stale docs, apply body conventions and copy labels |
| `plan-issue`             | `/elite-dev:plan-issue`             | Turn a GitHub issue into a reuse-checked implementation plan, inside plan mode       |
| `review-fix-pr-comments` | `/elite-dev:review-fix-pr-comments` | Triage and (on approval) fix unresolved PR review comments                           |
| `setup-keyvault`         | `/elite-dev:setup-keyvault`         | Set up Azure Key Vault for local dev secrets in .NET, Next.js, and Aspire apps       |
| `setup-script`           | `/elite-dev:setup-script`           | Create or extend a Windows setup.ps1 that prepares a developer machine for the repo  |
| `setup-worktree`         | `/elite-dev:setup-worktree`         | Set up or clean up a git worktree for a parallel dev session                         |
| `start-issue`            | `/elite-dev:start-issue`            | Mark a GitHub issue as started: assignee + project board status                      |

## Prerequisites

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated (`gh auth login`) — the
GitHub issue, PR, and worktree skills shell out to it. `setup-keyvault` instead needs the
[Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) on each developer
machine that runs the configured app.

See the root [README](../../README.md) for install/update/consumer-project setup shared by every
plugin in this repo, and the root [CLAUDE.md](../../CLAUDE.md) for how this repo is developed.
