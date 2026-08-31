# Simulated main-checkout state

- This is a Node/TypeScript project: `package.json` exists at the repo root.
- Saved output of `git status --porcelain --ignored`:

  ```text
  ?? .claude/settings.local.json
  ?? .env.local
  ```

  Both files are untracked (gitignored, never committed) — `git worktree add` will not carry
  them into the new worktree.

- `.gitignore` does not yet list `.claude/worktrees/`.
- No worktree exists yet under `.claude/worktrees/`.
- The developer asked directly for a new worktree for issue 21, branch `feat/21-product-entities`,
  based on `main`.
