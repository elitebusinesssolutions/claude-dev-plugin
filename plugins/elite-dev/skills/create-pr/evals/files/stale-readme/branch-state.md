# Simulated checkout state

- Current branch: `chore/rename-build-script`, based on `main`. `gh repo view --json
defaultBranchRef` confirms `main` as the repo's default branch.
- The branch name has no issue number, so no GitHub issue links to this branch.
- Commits on this branch:
  - `chore: rename npm build script to build:prod`
- Diff summary: the diff renames `package.json`'s `scripts.build` entry to
  `scripts["build:prod"]`. No other files change.
- The developer has not yet run `gh pr create`.
