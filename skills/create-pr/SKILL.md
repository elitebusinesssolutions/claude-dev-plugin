---
name: create-pr
description: >
  Opens a pull request following common conventions: an optional external-tracker link as the
  first line of the body (only for projects that use one), a bulleted summary, unwrapped
  paragraphs, a footer that references the linked GitHub issue (and closes it on merge when
  eligible), and labels copied from that issue. Use whenever creating a PR — "open a PR", "create
  the PR", "let's PR this" — or after `gh stack submit --auto`, which can create several PRs in
  one call that each need this treatment.
---

# Create PR

## 1. Body conventions

- This org tracks time in ETT — every dev has an ETT task assigned, so the PR body's first line
  is that task's link. Check the linked GitHub issue's body for the link first. Not there → ask
  the developer for it rather than guessing or omitting it. Only skip the line if the developer
  confirms this PR has no ETT task (rare, but happens).
- Prefer a bulleted list over one large paragraph in the Summary section once it's covering more
  than one distinct change — a wall of clauses joined by "and"/"also" is harder to scan than the
  same points as separate bullets.
- Within each paragraph or bullet, write it as one unwrapped line — don't hard-wrap PR bodies at
  ~70-80 columns like a commit message. GitHub soft-wraps a single line to the viewport; a
  paragraph split with manual newlines instead reads as narrow, choppy text in any raw/diff view
  (`gh pr view --json body`, the PR's Markdown source, an email notification).
- Before adding a closing footer, check the diff actually satisfies the linked issue's acceptance
  criteria/body — don't assume it does just because the branch names that issue. Fully satisfied →
  `Fixes #<N>` footer (branch-name-derived issue number, same source as the labels step below);
  this both links the PR to the issue and auto-closes it when the PR merges. Only partially
  addressed → use a non-closing reference instead (`Refs #<N>`, or mention it in the Summary) so
  merging doesn't close an issue with work still outstanding. No issue number in the branch name →
  no footer.
- `Fixes` only auto-closes when the PR's base is the repo's **default** branch (check with
  `gh repo view --json defaultBranchRef`) — GitHub ignores closing keywords on a PR targeting
  anything else. Check the base before using `Fixes`: for a single `gh pr create`, the base you
  passed it; for `gh stack submit --auto` PRs, use `gh pr list --json number,headRefName,baseRefName`
  (not `gh pr view --json baseRefName`, which only resolves the currently-checked-out branch's PR)
  to get each stack PR's base without switching branches. A non-bottom PR in the stack targets the
  previous stack branch, not the default branch, so use `Refs #<N>` there instead — only the
  bottom-of-stack PR (based on the default branch) can safely use `Fixes`.

## 2. Copy the linked issue's labels

Right after `gh pr create` (or for each PR `gh stack submit --auto` creates/updates):

1. Get the issue number from the PR's branch name (`type/N-slug` convention, e.g.
   `chore/186-raygun-admin-app` → issue 186). No issue number in the branch name → skip, no labels
   to copy.
2. `gh issue view <N> --json labels -q '.labels[].name'` for the label list — this prints one
   label per line, so join them with commas (e.g. pipe through `paste -sd,`) before the next step.
   Empty result (issue has no labels yet) → skip, don't call `gh pr edit --add-label` with an
   empty string.
3. Get the PR number: `gh pr create`'s own stdout is the new PR's URL. For `gh stack submit
--auto`, `gh pr view --json number -q .number` only ever resolves the currently-checked-out
   branch's PR — looping it per PR without switching branches would attach every stack PR's labels
   to that one PR instead. Use `gh pr list --json number,headRefName` and match each stack branch
   to its own PR number instead.
4. `gh pr edit <PR#> --add-label "<comma-joined-labels>"`.

No `--repo` flag on any of these calls — `gh` infers the repo from the cwd's git remote, same as
any other `gh` command run inside this checkout or one of its worktrees.

For `gh stack submit --auto`, repeat this per PR it created/updated — each branch in the stack may
reference a different issue, so don't assume one branch's labels apply to the whole stack.

`gh stack submit --auto` has no way to set a PR's body at creation time — it generates one from
commit metadata, leaving new PRs on the raw GitHub template. Before (or alongside) the label copy,
`gh pr edit <PR#> --body "..."` each PR it created with the §1 body conventions applied — otherwise
those PRs keep the template body indefinitely, with no tracker link, summary, or issue footer.

## Scope

This skill only shapes the PR body and labels; it doesn't decide _whether_ to open a PR, resolve
merge conflicts, or handle stacked-PR creation mechanics themselves — for that, install GitHub's
own `gh-stack` tooling: `gh extension install github/gh-stack` for the `gh stack` commands, and
`gh skill install github/gh-stack` for agent-native stack guidance.
