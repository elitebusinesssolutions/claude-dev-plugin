# elite-dev — Development Guide

`elite-dev` ships generic dev-workflow skills — git worktrees, GitHub issue tracking, pull
requests, PR review triage, Azure Key Vault dev secrets, developer machine setup — for any
TypeScript/JavaScript or .NET repo. It also ships one mod, `context-usage` (`hooks/`), which pins the
context window usage under the prompt; there are no command hooks.

Install it via:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-dev@elitebusinesssolutions
```

For the repo-wide layout, `plugin.json`/`marketplace.json` field rules, `SKILL.md` authoring
format, versioning policy, and git workflow conventions shared by every plugin in this repo, see
the root [CLAUDE.md](../../CLAUDE.md). This file covers only what is specific to `elite-dev`.

---

## Skills

- `create-pr`
- `plan-issue`
- `review-fix-pr-comments`
- `setup-keyvault`
- `setup-script`
- `setup-worktree`
- `start-issue`

---

## Stay stack-agnostic

Every skill in this plugin must work for a plain TypeScript/JavaScript repo, a Next.js app, a
.NET solution, or a mix (a `src/client` + `src/server` monorepo). Never hardcode:

- An org/repo name — resolve it from `gh repo view` or rely on `gh`'s cwd-based inference (no
  `--repo` flag needed inside a checkout).
- A default branch name — check `gh repo view --json defaultBranchRef` rather than assuming `main`
  or `develop`.
- A build/test/lint command — check `package.json` scripts or the project's build tooling
  (`dotnet build`, etc.) rather than assuming one toolchain.
- Org-specific IDs (a GitHub Projects board's field/option node IDs, a specific label set) —
  these belong in the _consuming_ project's own `CLAUDE.md`, looked up once per project. See
  `start-issue/SKILL.md` for the pattern.

  Exception: ETT (this org's time-tracking tool) is elite-only infrastructure, not
  project-specific — every consuming repo is an elite project with an ETT task per PR. Skills
  may hardcode ETT directly (see `create-pr/SKILL.md` §2) rather than pushing it to each
  consuming CLAUDE.md.

This stack-agnostic rule is specific to `elite-dev` — `elite-ts`, by contrast, deliberately targets
one stack.

---

## Context usage mod

The `context-usage` mod keeps a `ctx 42% 84k/200k` status line current. It is a Claude Code mod (a
hooks module that runs inside the engine, with no Node and no npm dependencies), not a command
hook, so `elite-dev` has no `package.json`.

- `hooks/hooks.json` names the one module in `modules`.
- `hooks/context-status-line.ts` hooks `session.start`, `prompt.submit`, `session.compact`, and
  `turn.complete` and refreshes the status line on each. The `prompt.submit` refresh is not awaited,
  so the usage read never delays a prompt.
- `hooks/context-status-format.ts` turns the usage reading into the status text.
- `hooks/*.test.ts` hold the tests.
- `tsconfig.json` extends the engine-generated `.claude-plugin/types/tsconfig.json`.

The engine writes `.claude-plugin/types/` (the `claude-code` types) when a session loads the mod
from this folder, and git ignores it. A fresh clone or worktree shows `claude-code` import errors in
VS Code until `setup.ps1` or `claude --plugin-dir plugins/elite-dev` has run once; `setup.ps1`
regenerates the types on every run. Then run
"TypeScript: Restart TS Server".

Before every PR, run this from the repo root:

```bash
npm run pre-pr
```

`scripts/pre-pr-check.js` regenerates `.claude-plugin/types/` with
`claude --plugin-dir <copy> -p "Reply with the word ok."` run on a temporary copy of the plugin, replaces
the real `types/` only once the copy produced `claude-code/index.d.ts`, then runs `npm test`,
`npm run validate:plugins`, `npm run typecheck`, `npm run lint`, and `npm run format:check:root`
(Prettier), stopping at the first failure. CI runs the same lint and Prettier checks.
A failed generation leaves the existing `types/` in place.
CI does not run `typecheck` (it has no generated types), so this local run is the only type check.
Regenerating makes it run against the types of the current `claude` CLI, not a stale copy. The
`claude -p` run is a real model call, so it needs a signed-in `claude`.

`npm test` includes `test:context-usage-mod` (`claude plugin test`), so it needs the `claude` CLI;
`validate:plugins` needs it too. `eslint.config.mjs` here lints the mod's TypeScript.

`claude plugin test` runs every `*.test.ts` under the folder it is given, gitignored ones included.
`test:context-usage-mod` (`scripts/test-context-usage-mod.js`) therefore runs it on a temporary copy
holding only the files git tracks or would track. A committed `*.test.ts` under `skills/` still runs
and fails it.

---

## Testing locally

```bash
claude --plugin-dir plugins/elite-dev
```

Skills appear as `/elite-dev:<name>`, and the mod loads with them. Reload after a change without
restarting: `/reload-plugins`.

---

## Adding a new skill checklist

- [ ] Create `skills/<name>/SKILL.md`
- [ ] Frontmatter has a `description` that explains when Claude should invoke it
- [ ] Skill body uses numbered steps
- [ ] Skill body encodes decisions and conventions (not just vague advice)
- [ ] No hardcoded org/repo name, default branch, or org-specific IDs — see [Stay stack-agnostic](#stay-stack-agnostic)
- [ ] Skill ends with a verification step
- [ ] Test with `claude --plugin-dir plugins/elite-dev /elite-dev:<name>`
- [ ] Add row to `README.md` skills table
- [ ] Add `evals/evals.json` under the skill's own directory — see the root
      [CLAUDE.md](../../CLAUDE.md#testing-skills-evals)
- [ ] Bump `PATCH`/`MINOR` version in `plugins/elite-dev/.claude-plugin/plugin.json` as appropriate
