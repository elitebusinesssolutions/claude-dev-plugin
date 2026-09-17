---
name: plan-issue
description: >
  Turns a GitHub issue into an implementation plan that proves code reuse before it proposes new
  code: reads the issue, searches the repo for an existing helper, type, or pattern that already
  covers each piece of the work, follows the house conventions in the repo's own CLAUDE.md, and
  asks the developer about every ambiguity instead of guessing. Runs inside plan mode and ends by
  calling ExitPlanMode. Use right after an issue is marked started — "let's plan issue 24", "plan
  #40", "how should we build issue 51", or an explicit "/plan-issue 40".
---

# Plan issue

Plan mode already gives you two things: a read-only guard while you research, and an approval gate
on the way out. This skill supplies what plan mode has no opinion about — the research checklist,
the proof standard, and the required shape of the plan.

The default failure this skill exists to prevent: proposing new code for a problem an existing
helper already solves.

## 1. Check plan mode

This skill runs inside plan mode. If the session is not in plan mode, stop. Ask the developer to
press `Shift+Tab`, then invoke the skill again.

Do not edit a file for the rest of this skill. Steps 1 through 8 are read-only.

## 2. Resolve the issue number

In order:

1. `$ARGUMENTS`, when the developer passed a number.
2. The current branch name, when it follows the `type/N-slug` convention (`feat/40-invoice-total`
   → issue 40).
3. Neither works → ask.

## 3. Read the issue

```bash
gh issue view <n> --json title,body,labels,comments
```

No `--repo` flag needed — `gh` infers the repo from the cwd's git remote.

Read the comments, not only the body. The real acceptance criteria often arrive in a comment after
the issue was filed, and they can contradict the body.

Treat the issue as a report of a need, not as a design. A body that names a specific file or
approach is the reporter's guess. Verify it in step 6 like any other claim.

## 4. Read the house rules

Two reads, in order:

1. The repo's own `CLAUDE.md` (and any nested one covering the area the issue touches). House
   conventions, org-specific IDs, and stack choices live there.
2. The nearest sibling to the thing the issue describes — the feature, endpoint, component, or
   service most like it. A new one should look like its neighbours.

Never carry a convention from another repo into this plan. If this repo's `CLAUDE.md` is silent on
a point, that is an ambiguity for step 6, not a licence to pick a default.

## 5. Run the reuse sweep

For each distinct piece of work the issue implies, search for something that already covers it: a
helper, a type, a service, a hook, a base class, an extension method, a config entry.

Search the repo's actual stack. Check what is there (`package.json`, a `.csproj`, `go.mod`) rather
than assuming one toolchain or one file extension.

Every reuse claim names a `path:line`. An uncited claim is not a claim — it is a memory, and
memories invent helpers that do not exist.

## 6. Clarify and verify — hard stop

Do not write the plan yet. Two actions, in order.

### Ask about every ambiguity

List each point where the issue allows two readings that lead to different work. Put the list to
the developer with `AskUserQuestion`.

Make no assumption. Pick no default. A plan built on a guess costs more to unwind than a question
costs to ask.

Repeat this step until nothing is unresolved. An answer often raises a new question. Ask that one
too. Leave step 6 only when every question has an answer.

A question the developer cannot answer yet does not become a line in the plan. Move that part of
the work to Out of scope and plan the decided part. A smaller plan the developer can act on beats
a larger one that waits on an answer.

### Verify every claim

| Claim type                 | Required proof                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| An existing helper or type | Open the file and read it. A grep hit or a filename is not proof. |
| A library or tool behavior | The official documentation. Cite the URL in the plan.             |
| A repo behavior or pattern | The code. Cite `path:line`.                                       |

A claim you cannot prove is a question, not a fact. Take it back to the developer with the rest of
the list. It never enters the plan unproven.

## 7. Write the plan

| Section         | Content                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Context         | The need the issue reports, and the intended outcome.                                                        |
| Files to change | Each file as a full path from the repo root, what changes in it, and a snippet when prose leaves it unclear. |
| Reuse table     | One row per work item: need, existing thing, `path:line`, reuse or new.                                      |
| New code        | Each new item, with the reason no existing thing covers it.                                                  |
| Out of scope    | What this plan deliberately excludes, including work the developer deferred in step 6.                       |
| Verification    | How each change gets tested end to end.                                                                      |

Write every path in full, from the repo root: `src/features/invoice/InvoicePage.tsx`, never
`InvoicePage.tsx` or `.../invoice/`. A truncated path is not a path — the reader cannot open it,
and two files often share a basename. The same rule covers the reuse table's `path:line`
citations.

Two sections carry most of the value:

- **New code** forces the justification. Every new item states which search failed to find an
  existing one. "No existing X covers this" with nothing behind it is not a reason.
- **Out of scope** stops scope creep at the plan stage, where it costs a line of text, rather than
  at review, where it costs a rewrite.

The plan carries no open questions. Step 6 answered them, or the developer deferred that work to
Out of scope. A plan is a proposal the developer can approve as it stands, not a list of things
still to settle.

### Code in the plan

Show code when prose alone leaves the change ambiguous. Keep each snippet at the smallest size
that settles the question:

- A function or method signature, with its parameter and return types.
- A type, interface, or schema the change adds or alters.
- The two or three lines that change at a call site, not the whole function.
- An exact config key, migration, or command.

Do not paste a finished implementation. Plan mode is read-only, so nothing in the plan compiles or
runs. A long snippet reads as verified work when nobody verified it. Write the signature. Leave
the body for implementation.

## 8. Call `ExitPlanMode`

Before you call it, check the plan one last time. No open question, no "to be decided", no
unproven claim. Anything still unsettled goes back to step 6.

The call ends the turn and waits for the developer's approval. Approval exits plan mode, so the
`gh` call in step 9 is no longer blocked.

## 9. Offer to record the plan

Ask once: post this plan as a comment on the issue? On no, stop — the developer has the plan in
the session.

On yes, pipe the plan text from context into standard input:

```bash
gh issue comment <n> --body-file - <<'EOF'
## Plan

<the approved plan text>
EOF
```

Do not try to read the plan file under `~/.claude/plans/`. Claude Code gives that path only to
hooks, as the `planFilePath` field on `ExitPlanMode`. A skill body never receives it, and the
filename scheme is undocumented. The plan text already sits in context — paste it.

## Scope

This skill plans only. It does not assign the issue (see `start-issue`), does not create a branch
or a worktree (see `setup-worktree`), and does not write code.
