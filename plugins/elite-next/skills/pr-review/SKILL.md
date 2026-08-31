---
name: pr-review
description: Full PR review covering conventions, security, code quality, and docs accuracy for a Next.js / TypeScript app backed by a .NET API. Use when you want to check project rules and standards — not a generic code review. For general bug-hunting and code quality, use /code-review after this.
---

You are performing a thorough PR review for a Next.js / TypeScript app backed by a .NET API. The authors may be non-technical, so your review must be explicit and actionable: name the file, line, problem, and exact fix.

## Step 1 — Get the diff

Run `git diff dev...HEAD` to see all changes. Also run `git log dev...HEAD --oneline` to see the commit list. If the user passed a PR number or branch name as an argument, use that ref instead.

## Step 2 — Review each category

Work through every category. For each finding note: **file + line** (as a markdown link), **what the problem is**, and **what to do instead**. Severity: 🔴 High, 🟡 Medium, 🟢 Low.

---

### A. Project Conventions

These rules apply to every PR.

**Architecture**

- New feature code must go in `src/features/<name>/` — not added directly to existing large route files
- All calls to the generated API client belong in service functions in `src/features/<feature>/` (or `src/shared/lib/` if shared across features) — not called directly inside components, Server Actions, or route handlers
- Client Components must never import a `*Service.ts` file directly — those files are `"server-only"`; a Client Component must go through a Server Action

**Data access**

- API responses should be typed from the generated schema (`components["schemas"][...]`) — no `any`/untyped response shapes
- If the .NET API contract changed, the generated client (`src/lib/api/generated/`) must be regenerated in the same PR — a PR that hand-edits a file under `generated/` should be rejected outright
- Data fetching for the initial page load should happen in a Server Component, not a client-side `useEffect`

**UI patterns**

- Destructive confirmations must use `AlertDialog` — not `window.confirm()`
- Styling must use Tailwind classes — no inline `style={{...}}` attributes

**Error handling**

- User-visible failures must call `toast.error()` — no `.catch(() => {})` silent swallows

**TypeScript**

- No new `as any` casts — use proper types or `unknown`

**Dependencies and tooling**

- Package manager is `npm` only — no lockfile from a different package manager committed alongside `package-lock.json`

**Git hygiene**

- Commit messages must follow Conventional Commits: `type(scope): message` — valid types are `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`
- Branch must be prefixed with `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, or `perf/` — never commit directly to `main` or `dev`

---

### B. Security

**Credentials and secrets**

- No hardcoded API URLs, tokens, or passwords — use `process.env.*`
- New env vars must be documented in `.env.example`; only variables that truly need browser exposure get a `NEXT_PUBLIC_` prefix — everything else (API base URL, client secrets) stays server-only

**Access control**

- New routes or Server Actions that call the .NET API must verify a valid session before fetching — a missing session check means an unauthenticated request reaches the API with no token
- Admin-only features must be enforced by the .NET API (authorization policy / JWT claim check server-side) — a React boolean or UI-layer redirect is not sufficient enforcement, since anyone can call a Server Action or Route Handler directly
- Account creation/registration must go through the .NET API's own auth endpoint — a Next.js Route Handler must not mint or self-sign tokens

**Input handling**

- User-supplied input (form fields, URL params, query strings) must be validated before being sent to the .NET API
- No `dangerouslySetInnerHTML` with unsanitized user content

**Route Handlers** (`src/app/api/**/route.ts`, if any added or changed)

- Any Route Handler that proxies to the .NET API must check the caller's session itself — Route Handlers are publicly reachable by default and do not inherit page-level auth checks
- The bearer token attached to the outbound API call must come from the current user's session, never a hardcoded or shared service token, unless the route is explicitly a server-to-server integration

**Queries**

- API calls that can return large result sets must use the API's pagination parameters — no fetching an unbounded list on every request

---

### C. Code Quality

**TypeScript**

- Function parameters and return types should be typed — watch for implicit `any` from missing annotations
- Avoid unnecessary type assertions (`as SomeType`); prefer narrowing

**React correctness**

- Lists must have `key` props that are stable and unique (not array index)
- `useEffect`/`useMemo`/`useCallback` dependency arrays must be complete — missing deps cause stale closure bugs
- State updates must be immutable — no direct array or object mutations
- Server Components should not be marked `"use client"` unless they genuinely need browser APIs, state, or event handlers

**Testing**

- If core business logic (pricing, calculations, data transforms) changed, accompanying tests in the same PR are required — untested logic changes are 🔴
- If a file with existing tests was modified, confirm the tests were also updated

**Component design**

- New components over ~300 lines should be broken up
- If the same API call appears in more than one place, flag it as a candidate for a shared service function
- Async data-fetching components must handle loading and error states visibly — a blank section with no feedback is not acceptable

**New dependencies**

- For any new `npm` package: note what it does, whether a lighter alternative or browser/framework built-in exists, and whether it introduces known vulnerabilities

---

### D. README Accuracy

Check whether `README.md` needs updating based on what this PR changes. For each applicable change type, verify the corresponding section reflects reality.

| If the PR…                                | Check README section                          |
| ----------------------------------------- | --------------------------------------------- |
| Adds or removes a route                   | Project Structure → `src/app/`, Routes table  |
| Adds or removes a feature folder          | Project Structure → `src/features/`           |
| Adds or removes a Route Handler           | Project Structure → `src/app/api/`            |
| Changes the .NET API contract             | API Integration, generated client regen steps |
| Changes auth mechanism or security policy | Authentication & Security                     |
| Adds or removes an `npm` script           | Other Scripts                                 |
| Adds a new global tool dependency         | Prerequisites                                 |
| Adds or removes a file under `scripts/`   | Project Structure → `scripts/`                |

Flag any section that is out of date as 🟡 Medium — README drift is not blocking but should ship in the same PR as the change that caused it.

---

### E. CLAUDE.md Accuracy

Check whether `CLAUDE.md` needs updating based on what this PR changes.

| If the PR…                                       | Check CLAUDE.md section            |
| ------------------------------------------------ | ---------------------------------- |
| Changes the .NET API contract                    | API Integration table              |
| Adds or removes a feature folder                 | Folder Structure table             |
| Adds or renames a file in `src/shared/`          | Folder Structure section           |
| Establishes or retires a "avoid" pattern         | Things to Avoid                    |
| Adds or removes an `npm` script                  | Commands section                   |
| Changes test conventions or adds a test location | Testing section                    |
| Changes an architecture rule or invariant        | Architecture — Know Before Editing |

Flag any section that is out of date as 🟡 Medium — CLAUDE.md drift is not blocking but should ship in the same PR as the change that caused it.

---

## Step 3 — Write the report

```text
## PR Review: <branch or PR title>

### Summary
One paragraph. What does this PR do? Is it safe to merge?

### 🔴 High — Must fix before merge
(list findings, or "None")

### 🟡 Medium — Should fix before merge
(list findings, or "None")

### 🟢 Low — Nice to fix (non-blocking)
(list findings, or "None")

### ✅ Looks good
(things done well — be specific)
```

For each finding: link to the file and line, describe the exact problem, give the exact fix. "Change line 142 to call `toast.error(message)` in the catch block" is better than "improve error handling."

---

## Step 4 — Deep bug review

After delivering the PR review report, ask: **"Want a deeper review for bugs and logic errors?"**

If the user confirms, run the `/code-review` skill inline and present its findings as a formatted markdown report — **do not output the raw JSON array**. Use this structure:

```text
## Deep Review: Bugs & Logic Errors

### 🔴 Critical
### 🟡 Medium
### 🟢 Low
```

For each finding: a bold one-line title linking to **file:line**, one paragraph describing the bug and the exact failure scenario, and a concrete **Fix:** line. Omit empty severity sections.
