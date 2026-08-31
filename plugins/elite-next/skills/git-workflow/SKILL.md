---
name: git-workflow
description: Start or finish a git feature branch following this project's branching conventions and conventional commits. Use when starting new work, committing changes, or preparing a PR.
---

Follow this project's branching and commit conventions end-to-end. Work through the relevant steps below based on where the user is in their workflow.

## Branch naming

All branches must follow this pattern:

```text
<type>/<short-description>
```

Types and when to use them:

| Type       | Use for                                       |
| ---------- | --------------------------------------------- |
| `feat`     | New user-facing feature or capability         |
| `fix`      | Bug fix                                       |
| `chore`    | Tooling, deps, config, non-functional changes |
| `refactor` | Code restructuring with no behavior change    |
| `docs`     | Documentation only                            |
| `test`     | Adding or fixing tests only                   |
| `perf`     | Performance improvement                       |

The description is lowercase, hyphen-separated, ≤5 words. Examples:

```text
feat/add-quote-status-filter
fix/notification-service-null-check
chore/regenerate-api-client
refactor/extract-invoice-service
```

**Never branch from `main` for feature work.** Always branch from `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b feat/your-feature-name
```

If `dev` does not exist yet, confirm the base branch with the user before continuing.

## Commit message format

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Every commit must follow:

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type

Same values as branch types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.

### Scope

Scope is the area of the codebase affected. Use one of these established scopes, or omit if the change is cross-cutting:

| Scope    | Covers                                              |
| -------- | --------------------------------------------------- |
| `api`    | Generated API client, service layer, Server Actions |
| `auth`   | Authentication, session handling                    |
| `ui`     | Shared components, design tokens, styles            |
| `admin`  | Admin panel features                                |
| `hooks`  | Claude Code plugin hooks                            |
| `skills` | Claude Code plugin skills                           |

Examples:

```text
feat(api): add status filter to orders endpoint call
fix(api): handle null profile in notification service
chore(ui): upgrade shadcn/ui button component
refactor(admin): extract invoice list into service layer
```

### Description

- Lowercase, imperative mood ("add", "fix", "remove" — not "added", "fixes", "removing")
- No period at the end
- ≤72 characters on the first line

### Breaking changes

Add `!` after the type/scope for a breaking change, and explain in the footer:

```text
feat(api)!: rename quotes endpoint to proposals

BREAKING CHANGE: all references to `/api/quotes` must be updated to `/api/proposals`
```

## Step-by-step: starting new work

1. **Confirm the type and scope** with the user if not already clear.
2. **Create the branch** from `dev`:

   ```bash
   git checkout dev && git pull origin dev
   git checkout -b <type>/<description>
   ```

3. Confirm the branch was created: `git branch --show-current`.

## Step-by-step: committing changes

1. **Show the diff** so nothing unexpected is staged:

   ```bash
   git diff --staged --stat
   git status
   ```

2. **Stage the relevant files.** Stage specific files by name — avoid `git add .` which can pick up `.env`, generated files, or unrelated changes.

3. **Compose the commit message** following the format above. Check:
   - Type is correct for the actual change
   - Scope is present if the change is localized
   - Description is imperative, lowercase, ≤72 chars
   - If any public API or behavior changed, include `!` and a `BREAKING CHANGE:` footer

4. **Commit**:

   ```bash
   git commit -m "feat(scope): description"
   ```

5. After committing, remind the user to run `npm test` (and `tsc --noEmit`, if the project uses TypeScript) before pushing.

## Step-by-step: opening a PR

1. Push the branch:

   ```bash
   git push -u origin <branch-name>
   ```

2. **PR targets `dev`**, not `main`. `main` is the production branch; only `dev` merges into it on release.

3. **PR title** must follow conventional commit format (same as a commit message):

   ```text
   feat(api): add status filter to orders endpoint call
   ```

4. **PR description** should include:
   - What changed and why (not a list of files)
   - Regeneration steps if the .NET API contract changed
   - Screenshot or Loom if there's a UI change
   - Link to the relevant ticket if one exists

5. Request review before merging. Do not self-merge without a review except for `chore` or `docs` branches.

## Common mistakes to avoid

- Branching from `main` instead of `dev`
- Generic descriptions: `fix/bug`, `feat/update`, `chore/changes`
- Commit messages that describe the diff rather than the intent: "update schema.d.ts" vs "chore(api): regenerate client after API contract change"
- Staging `.env`, `node_modules`, or generated files
- Merging to `main` directly without going through `dev`
- Past-tense commit descriptions ("added", "fixed")
