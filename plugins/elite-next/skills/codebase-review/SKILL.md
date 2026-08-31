---
name: codebase-review
description: Full audit of the entire codebase — security, performance, and software best practices. Use when reviewing a whole project (especially one built quickly with AI assistance) rather than a single PR or diff. For diff-scoped review use /elite-next:pr-review or /code-review instead.
disable-model-invocation: true
---

You are auditing an entire codebase, not a diff. Assume it was built rapidly with AI assistance by non-technical builders: the app likely works, but security gaps, performance traps, and structural debt may be invisible to its owners. Your job is to find what matters, explain it in plain language, and hand back a prioritized fix list — not to nitpick style.

If the user passed arguments, treat them as a focus: `$ARGUMENTS` may name a subdirectory (audit only that), or a dimension (`security`, `performance`, `practices` — run only that section). With no arguments, run everything.

## Step 1 — Orient

Build a mental map before judging anything:

1. Read `README.md`, `CLAUDE.md`, and `package.json` (scripts, dependencies).
2. Map the tree: list top-level directories, `src/app/` routes, `src/lib/api/` (generated client + wrapper), config files.
3. Identify the stack and entry points: routes, auth/session setup, the API client wrapper (`src/lib/api/client.ts`), Route Handlers under `src/app/api/`, environment variable usage.
4. Note the size: rough file and line counts. For large codebases (>200 source files), fan out — launch parallel Explore/general-purpose agents, one per area (auth, service layer, UI, Route Handlers), and synthesize their findings instead of reading everything serially.

Do **not** report findings yet. This step exists so later findings are accurate about how the app actually works.

## Step 2 — Security review 🔒

This is the highest-priority section. Vibe-coded apps most commonly fail here because the app "works" identically with or without these protections.

**Secrets and credentials**

- Grep for hardcoded keys: `sk-`, `eyJ` (JWT-shaped strings), `password`, `secret`, `api_key`, `Bearer ` in source files
- Any bearer token or client secret **must never appear in a Client Component or anything bundled to the browser** — only in `"server-only"` service files, reading from `process.env.*`
- Check `.gitignore` covers `.env`, `.env.local`; run `git log --diff-filter=A --name-only -- '*.env*'` to see if a secrets file was ever committed (a key committed then deleted is still leaked — flag for rotation)

**Access control**

- Every Server Action and Route Handler that calls the .NET API must attach a token derived from the _current user's_ session — grep for `createApiClient(` calls with no token argument, or a hardcoded/shared token
- Authorization (who's allowed to do what) must be enforced by the .NET API itself. A React `isAdmin` boolean or route guard is UI decoration, not security — anyone can call a Server Action or Route Handler directly, bypassing the UI entirely
- Server Components/Actions that fetch user-specific data must verify a session exists before calling the API — a missing check sends an unauthenticated request and may render whatever the API returns for "no user" (often nothing, but sometimes a misleading empty state rather than a redirect to login)
- Route Handlers under `src/app/api/` are publicly reachable by default — confirm each one that proxies to the .NET API performs its own session check; it does not inherit any page-level auth

**Input handling**

- Form fields, URL params, and query strings validated before being sent to the .NET API
- `dangerouslySetInnerHTML` with user-supplied content

**Dependencies**

- Run `npm audit` and report high/critical vulnerabilities with the upgrade path

## Step 3 — Performance review ⚡

- API calls that fetch unbounded lists with no pagination parameters — these work fine with 50 rows in dev and fall over at 50,000
- API calls inside loops or inside `.map()` — N+1 patterns; check whether the .NET API exposes a batch/bulk endpoint instead
- Data fetching in `useEffect` with missing or wrong dependency arrays causing refetch storms — and more broadly, any initial-load fetch that's client-side (`useEffect`) when it could be a Server Component fetch instead
- Expensive computation in render bodies without `useMemo`; large lists without virtualization (>~200 rows)
- Heavy dependencies imported for trivial use (moment.js for one date format, lodash for one `map`) — note bundle impact
- Unoptimized images — check for raw `<img>` tags where `next/image` would give automatic optimization
- Server Components marked `"use client"` unnecessarily, pulling data-fetching logic into the browser bundle for no reason

## Step 4 — Best practices review 🧱

- **TypeScript escape hatches**: count `as any`, `any` parameters, `@ts-ignore`/`@ts-expect-error`. A handful is normal; dozens means the type system is off and bugs are invisible
- **Silent error handling**: `.catch(() => {})`, empty `catch` blocks, missing error states in data-fetching components — users see a blank screen and the owner never learns it broke
- **Architecture drift**: generated API client called directly inside page/route/component code instead of through a service function; a Client Component importing a `*Service.ts` file directly; feature code dumped into one giant file. Point at `/elite-next:extract-service` and `/elite-next:extract-component` as the fixes
- **Duplication**: the same API call, constant, or component pattern copy-pasted across files — one future edit will miss a copy
- **Oversized files**: components over ~300 lines, files over ~500
- **Dead code**: unused exports, commented-out blocks, orphaned files no route reaches
- **Testing**: does core business logic (pricing, calculations, data transforms) have any tests at all? If none exist, don't demand full coverage — name the 3–5 functions where a silent bug costs real money and point at `/elite-next:unit-tests`
- **Generated client hygiene**: is `src/lib/api/generated/` hand-edited anywhere (grep for edits that don't match a fresh codegen run)? Is there evidence the client is stale relative to the .NET API's current contract (a service function referencing a schema shape the generated types no longer have)?

## Step 5 — Deep bug hunt with /code-review

The steps above audit structure and patterns; `/code-review` hunts for concrete correctness bugs. Run it now:

1. If there is uncommitted work or an unmerged feature branch, run the `/code-review` skill at **high** effort — recent vibe-coded work is where live bugs concentrate.
2. If the working tree is clean and merged, instead pick the 3–5 highest-risk files found during Steps 2–4 (money, auth, data mutation) and adversarially review them yourself with the same standard: for each suspected bug, state the concrete inputs and state that trigger it and the wrong result that follows. A bug you can't name a failure scenario for is not a finding.

Fold confirmed bugs into the report below — do not output raw JSON.

## Step 6 — Write the report

The reader is non-technical. Every finding must say what could go wrong in business terms, not just what rule was violated. "Anyone on the internet can trigger this action without logging in" lands; "missing session check" does not.

```text
# Codebase Review: <project name>

## Overview
2–3 sentences: what the app is, overall health, and the single most important thing to fix.

## Scorecard
| Area | Grade | One-line summary |
| --- | --- | --- |
| Security | 🔴/🟡/🟢 | ... |
| Performance | 🔴/🟡/🟢 | ... |
| Code practices | 🔴/🟡/🟢 | ... |
| Testing | 🔴/🟡/🟢 | ... |

## 🔴 Critical — fix this week
For each: **plain-language title**, file:line links, what an attacker/failure looks like in practice, and the exact fix (or the /elite-next: skill that performs it).

## 🟡 Important — fix this month
Same format.

## 🟢 Improvements — when convenient
Brief list.

## ✅ Done well
Be specific — the owners should know what to keep doing.

## Suggested order of work
Numbered list, dependencies respected (e.g. "add the session check before adding more Server Actions that touch that endpoint"). Where an /elite-next: skill automates a fix, name it.
```

Rules for findings:

- Every finding links to **file:line**
- Severity reflects real-world impact, not rule pedantry: exposed data and money bugs are 🔴; a missing `useMemo` is 🟢
- Give the exact fix, not "improve X" — show the corrected line or the command to run
- Cap the report at what's actionable: the top ~25 findings, with a one-line note if more exist ("plus 14 more unpaginated list-fetch sites — fix the pattern once and sweep with /elite-next:find-usages")

## Step 7 — Offer next steps

End by asking which critical finding to fix first, and note that fixes should go through `/elite-next:git-workflow` (branch from `dev`, conventional commits) rather than direct edits to `main`.
