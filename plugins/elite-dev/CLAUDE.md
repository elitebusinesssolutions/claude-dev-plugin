# elite-dev — Development Guide

`elite-dev` ships generic dev-workflow skills — git worktrees, GitHub issue tracking, pull
requests, PR review triage — for any TypeScript/JavaScript or .NET repo. No hooks, skills only.

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
- `review-fix-pr-comments`
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
  may hardcode ETT directly (see `create-pr/SKILL.md` §1) rather than pushing it to each
  consuming CLAUDE.md.

This stack-agnostic rule is specific to `elite-dev` — `elite-next` and `elite-ts`, by contrast,
deliberately target one stack each.

---

## Testing locally

```bash
claude --plugin-dir plugins/elite-dev
```

Skills appear as `/elite-dev:<name>`. Reload after a change without restarting: `/reload-plugins`.

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
- [ ] Bump `PATCH`/`MINOR` version in `plugins/elite-dev/.claude-plugin/plugin.json` as appropriate
