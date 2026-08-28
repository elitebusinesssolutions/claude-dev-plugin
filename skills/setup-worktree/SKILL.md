---
name: setup-worktree
description: >
  Set up or clean up a git worktree for a parallel Claude/dev session on a TypeScript/JavaScript
  or .NET repo. Use when starting a new worktree ("set up a worktree for issue X", "start a
  parallel session"), or when a PR merges and its worktree needs removing. Not needed for a
  single-task session working directly in the main checkout.
---

## Parallel sessions & git worktrees

Multiple Claude/dev sessions sometimes run against this repo at the same time. When that's the
case, a session that **edits files** should generally get its own git worktree, keeping the main
checkout on its default branch for planning/issue sessions that don't touch the working tree. This
is a suggestion, not a hard rule — if the developer is only working on a single task, a worktree
is overkill and working directly in the main checkout is fine. **Ask the developer before creating
a worktree** rather than creating one automatically.

- **Layout**: worktrees live under `.claude/worktrees/` at the repo root, named after the branch
  with `/` flattened to `-`. This path is nested inside the main checkout, so it must stay listed
  in `.gitignore` (`.claude/worktrees/`) — otherwise the main checkout's `git status` sees every
  worktree as a pile of untracked files:

  ```powershell
  # from the main checkout
  git worktree add .claude/worktrees/feat-21-product-entities -b feat/21-product-entities main
  ```

- **Per-worktree setup** — untracked files don't come along, so in each new worktree, copy over
  whichever of these exist in your main checkout:
  - `.claude/settings.local.json` — Claude Code permissions are keyed by path; without it a new
    worktree re-prompts for everything.
  - any local env/secret files the project uses (`.env`, `.env.local`, `appsettings.Development.json`,
    etc.) — these are gitignored by design, so a fresh worktree starts without them and the app
    fails to start or hits missing-config errors until they're copied over.

    ```powershell
    $name = "<name>"  # e.g. feat-21-product-entities
    if (Test-Path .claude/settings.local.json) { Copy-Item .claude/settings.local.json ".claude/worktrees/$name/.claude/" -Force }
    Get-ChildItem -Recurse -Filter ".env*" -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
      ForEach-Object {
        $rel = Resolve-Path -Relative $_.FullName
        $dest = Join-Path ".claude/worktrees/$name" (Split-Path $rel -Parent)
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        Copy-Item $_.FullName $dest -Force
      }
    ```

  - Install dependencies fresh in the new worktree — a worktree is a separate working directory,
    so `node_modules`/`bin`/`obj` don't carry over: `npm install` / `pnpm install` for a
    TypeScript/JavaScript project, `dotnet restore` for a .NET solution. Both are cheap on repeat
    runs — package managers hard-link or cache from a machine-global store.
- **Only one instance of a singleton dev process runs at a time across all worktrees** — a shared
  dev server, an orchestrator like .NET Aspire's AppHost, or anything else that binds fixed ports
  or container names collides if run from two worktrees simultaneously. Building/testing in
  parallel is fine; running the app is not, unless the project's dev tooling supports multiple
  concurrent instances (e.g. per-worktree port overrides).
- A branch can only be checked out in **one** worktree at a time (git enforces this), and a
  `gh-stack` stack lives entirely in one worktree — never rebase/sync the same stack from two
  sessions. Pass `--base <default-branch>` to `gh stack init`/`gh stack link` if the repo's default
  branch isn't `main`. `gh stack` unavailable → `gh extension install github/gh-stack`
  (add `gh skill install github/gh-stack` too, for agent-native stack guidance).
- **Cleanup** when the PR merges: `git worktree remove .claude/worktrees/<name>` from the main
  checkout (`git worktree list` / `git worktree prune` to tidy up stale entries).
