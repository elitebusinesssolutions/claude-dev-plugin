# Simulated checkout state

- Current branch: `chore/186-raygun-admin-app`, based on `main`. `main` is the default branch of
  the repo, per `gh repo view --json defaultBranchRef`.
- Commits on this branch:
  - `feat: fetch Raygun error feed in admin app`
  - `feat: poll the error feed every 60 seconds`
- Diff summary: the branch adds `src/admin/RaygunFeed.tsx`. This file fetches and renders the
  error feed.
- The branch also adds a 60-second polling interval in `src/admin/useRaygunFeed.ts`.
- Both acceptance criteria of issue #186 are met.
- A new test in `src/admin/RaygunFeed.test.tsx` covers both changes.
- `gh pr create` has not run yet.
