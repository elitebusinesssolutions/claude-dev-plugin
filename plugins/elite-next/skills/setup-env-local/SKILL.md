---
name: setup-env-local
description: Configure API_BASE_URL (and related .NET API connection settings) in .env.local for a Next.js project — use when the user can't connect to the .NET API locally, or is setting up their dev environment for the first time.
---

Guide the user to point their local Next.js dev server at a running .NET API instance, and write the result to `.env.local`.

## Step 1 — Find the project root

Search the git repo root and its immediate subdirectories (depth 1, excluding `node_modules`) for a directory containing both `package.json` and a Next.js config (`next.config.ts`, `.js`, or `.mjs`).

- **One match** → use it as `<project-root>`, proceed to Step 2.
- **No match** → ask: "I couldn't find a Next.js project. Are you using Next.js? If not, tell me which framework and I'll adapt the variable names accordingly."
- **Multiple matches (monorepo)** → ask which directory to write `.env.local` to. Verify it contains `package.json` and a Next.js config, warn if it doesn't, and confirm with the user before proceeding. After two failed attempts, offer: "Would you like to specify the full absolute path manually?"

## Step 2 — Check current state

Read `<project-root>/.env.local`. Three cases:

- **`API_BASE_URL` is set and non-empty** → ask: "`<project-root>/.env.local` already has a value for `API_BASE_URL`. Do you want to replace it?" If yes, continue to Step 3. Otherwise stop.
- **File missing, key line absent, or key is empty** → continue to Step 3.
- **Read error** → tell the user: "I could not read `<project-root>/.env.local`. Please check file permissions and try again, or open the file manually." Stop until resolved.

## Step 3 — Get the local API URL

Ask the user: "What URL is your local .NET API running on? (e.g. `https://localhost:5001` or `http://localhost:5000`)" If they don't know, suggest they check `launchSettings.json` in the .NET API project (`applicationUrl` under the `https` profile) or run the API and note the URL it prints on startup.

If the .NET API uses a self-signed dev certificate (the default for `dotnet run` over HTTPS) and the user reports certificate errors when Next.js calls it, note that `NODE_TLS_REJECT_UNAUTHORIZED=0` is a common local-only workaround — never suggest it for anything beyond `.env.local` on a developer machine.

## Step 4 — Write the value

Write to `<project-root>/.env.local`:

- **File doesn't exist** → create it with a single line: `API_BASE_URL=<url>`
- **Line present and non-empty** → replace that line in place, preserving all other contents.
- **Line present but empty** → replace that line in place.
- **File exists but line is missing** → append `API_BASE_URL=<url>` on a new line, ensuring it starts on its own line regardless of whether the file already ends with a newline.

After writing, tell the user: "`.env.local` has been updated. Restart your dev server (e.g., `npm run dev`) so Next.js picks up the change."

## Step 5 — Regenerate the typed API client (if needed)

If `src/lib/api/generated/` doesn't exist yet, or the user mentions the API contract changed, remind them to regenerate the typed client against the now-configured API:

```bash
npx openapi-typescript "$API_BASE_URL/swagger/v1/swagger.json" -o src/lib/api/generated/schema.d.ts
```

Adjust the Swagger/OpenAPI JSON path to whatever this project's .NET API actually exposes it at — check the API's `Program.cs`/`Startup.cs` for the configured route if `/swagger/v1/swagger.json` 404s.

## Rules

- `API_BASE_URL` belongs only in `.env.local` (gitignored), never in `.env` (which is committed) — local API ports vary per developer.
- If the project ever needs the API URL in a Client Component (rare — prefer Server Actions), it must be duplicated under a `NEXT_PUBLIC_` prefix explicitly, and only ever point at a public, non-authenticated endpoint.

## Troubleshooting

**Requests to the API fail after restarting the dev server:**

> Check: (1) is the .NET API actually running? (2) does the port in `API_BASE_URL` match what the API printed on startup? (3) is there a certificate error in the terminal (self-signed dev cert)? (4) did you fully stop and restart `npm run dev`?

**`API_BASE_URL` is undefined at runtime:**

> Ensure `.env.local` is in the same directory as `next.config.*` — Next.js only loads env files from the project root. Also confirm the code reads `process.env.API_BASE_URL` in a server-only context (Server Component, Server Action, or Route Handler) — this variable is not exposed to the browser.

## Checklist

- [ ] `<project-root>/.env.local` contains `API_BASE_URL` with a non-empty value
- [ ] `.env.local` is listed in `.gitignore` (confirm it will not be committed)
- [ ] Dev server restarted so Next.js picks up the new value
- [ ] Typed API client regenerated if the API contract changed since it was last generated
