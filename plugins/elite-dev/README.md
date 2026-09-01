# elite-dev

Generic dev-workflow skills for Claude Code: git worktrees, GitHub issue tracking, pull requests,
and PR review triage.

```bash
claude plugin install elite-dev@elitebusinesssolutions
```

## Skills

| Skill                    | Invoke                              | Purpose                                                                            |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------- |
| `create-pr`              | `/elite-dev:create-pr`              | Open a PR with consistent body conventions and labels copied from the linked issue |
| `review-fix-pr-comments` | `/elite-dev:review-fix-pr-comments` | Triage and (on approval) fix unresolved PR review comments                         |
| `setup-worktree`         | `/elite-dev:setup-worktree`         | Set up or clean up a git worktree for a parallel dev session                       |
| `start-issue`            | `/elite-dev:start-issue`            | Mark a GitHub issue as started: assignee + project board status                    |

## Prerequisites

Requires the [GitHub CLI](https://cli.github.com/) (`gh`), authenticated (`gh auth login`) — every
skill here shells out to it.

See the root [README](../../README.md) for install/update/consumer-project setup shared by every
plugin in this repo, and the root [CLAUDE.md](../../CLAUDE.md) for how this repo is developed.
