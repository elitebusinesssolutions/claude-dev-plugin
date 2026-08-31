---
name: start-issue
description: >
  Marks a GitHub issue as started: assigns it to the developer and, if this repo uses a GitHub
  Projects board, sets its Status to "In Progress". Use as soon as work on an issue begins — a
  planning session counts, not just writing code — e.g. "let's plan issue 24", "let's start #40",
  "begin working issue 51", or an explicit "/start-issue 40". Invoke it at the start of that work,
  before diving into planning or implementation.
---

# Start issue

Beginning work on an issue — planning included — means getting two pieces of GitHub state set
right away:

1. the issue is **assigned to the developer** doing the work, and
2. if this repo tracks work on a GitHub Projects (v2) board, its **Status** is set to
   **In Progress**.

Both are idempotent — re-running on an already-started issue is harmless. If the issue is already
assigned to someone else, stop and ask before adding yourself as an additional assignee.

## 1. Assign the developer

Check the current assignees first:

    gh issue view <n> --json assignees

No `--repo` flag needed — `gh` infers the repo from the cwd's git remote.

`@me` resolves to whoever's `gh` login is active, which is right in almost every session; only pass
an explicit login if the user says the work is someone else's.

    gh issue edit <n> --add-assignee "@me"

## 2. Set board Status to In Progress (if this repo uses a Projects board)

`gh issue edit` can't touch Projects-v2 fields; this needs `gh project item-edit` with the board's
node IDs. Those IDs are specific to each org's project and don't transfer between repos, so look
them up once per project and record them in this repo's own `CLAUDE.md` (or ask the developer —
they likely already have them from a previous session):

```bash
# Find the project number for this org/repo
gh project list --owner <org>

# Get the project's node ID and its Status field's option IDs
gh project field-list <project-number> --owner <org> --format json
```

Once recorded (example shape — replace with this repo's actual values):

| Thing                      | ID           |
| -------------------------- | ------------ |
| Project                    | `PVT_...`    |
| Status field               | `PVTSSF_...` |
| Status option: Todo        | `...`        |
| Status option: In Progress | `...`        |
| Status option: Done        | `...`        |

Look up the issue's board **item** id, then flip the field:

```powershell
$item = gh project item-list <project-number> --owner <org> -L 200 --format json |
    ConvertFrom-Json | ForEach-Object items | Where-Object { $_.content.number -eq <n> }
gh project item-edit --id $item.id --project-id <project-node-id> `
    --field-id <status-field-id> --single-select-option-id <in-progress-option-id>
```

If `$item` comes back empty, the issue was never added to the board (`gh issue create` silently
skips the board unless `--project` was passed — a known trap). Add it first, then re-run the
lookup:

```powershell
gh project item-add <project-number> --owner <org> `
    --url https://github.com/<owner>/<repo>/issues/<n>
```

If this repo doesn't use a Projects board at all, skip this step entirely — assigning the issue
(step 1) is the whole job.

## 3. Verify

One call confirms the assignment (and, if applicable, cross-check against the board separately —
`gh issue view` doesn't expose Projects-v2 field values):

```bash
gh issue view <n> --json assignees,projectItems
```

## Scope

This skill only sets the "work has started" state — it does not create branches or worktrees.
Whether the session wants a worktree is a separate, ask-first decision — see the `setup-worktree`
skill.
