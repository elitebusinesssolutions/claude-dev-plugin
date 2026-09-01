# claude-dev-plugin — Development Guide

This repo is a Claude Code plugin marketplace holding two plugins, each in its own subdirectory
under `plugins/`:

- **`elite-dev`** — generic dev-workflow skills (git worktrees, GitHub issues, pull requests) for
  any TypeScript/JavaScript or .NET repo. Skills only, no hooks. See its own
  [CLAUDE.md](plugins/elite-dev/CLAUDE.md).
- **`elite-ts`** — shared lint/format hooks and formatting-setup/verification skills for
  TypeScript projects. See its own `plugins/elite-ts/CLAUDE.md`.

Install any of them via:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-dev@elitebusinesssolutions
claude plugin install elite-ts@elitebusinesssolutions
```

Official docs this file enforces:

- [Creating plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skills authoring](https://code.claude.com/docs/en/skills)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

---

## Directory layout

**Rules enforced by the official spec:**

- The root `.claude-plugin/` holds only `marketplace.json`. Each plugin's own `.claude-plugin/`
  (under `plugins/<name>/`) holds only that plugin's `plugin.json`. Never put `skills/`, `hooks/`,
  `agents/`, or scripts inside either.
- Each plugin's `skills/` sits at that plugin's own root (`plugins/<name>/skills/`), not nested
  inside `.claude-plugin/` and not shared across plugins.
- Each skill is a directory containing exactly one `SKILL.md` — the directory name becomes the
  skill's invocation name (e.g., `plugins/elite-dev/skills/create-pr/SKILL.md` →
  `/elite-dev:create-pr`).
- A plugin cannot reference files outside its own directory with `../` paths — this is rejected
  for security.

---

## plugin.json

Reference: [Plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema)

Each plugin has its own `plugins/<name>/.claude-plugin/plugin.json`. Field rules:

| Field         | Rule                                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | The namespace prefix — skills invoke as `/<name>:<skill>`. Keep it short, lowercase, hyphen-only.                                                                                                                                                                                                              |
| `version`     | Bump this with every release of that plugin. Users only get updates when the version field changes. Omitting it causes every commit to count as a new version, triggering reinstalls. Use semver.                                                                                                              |
| `description` | One sentence. Shown in the plugin manager.                                                                                                                                                                                                                                                                     |
| `repository`  | This repo's URL (`https://github.com/elitebusinesssolutions/claude-dev-plugin`), same for both plugins now that they share a repo.                                                                                                                                                                             |
| `skills`      | Points at that plugin's own `./skills/` directory, relative to the plugin's own root — never a path into another plugin's directory.                                                                                                                                                                           |
| `hooks`       | Never point it at `./hooks/hooks.json`. That file is the standard location and loads automatically; naming it again makes Claude Code report `Duplicate hooks file detected` and fail the whole plugin load. Set this field only for an _additional_ hooks file beyond the standard one. Both plugins omit it. |

---

## Skills

Reference: [Agent Skills](https://code.claude.com/docs/en/skills)

### File format

Every skill is a folder under a plugin's own `skills/` containing a required `SKILL.md`
(frontmatter plus body) and, optionally, a `reference.md` for large content loaded on demand.

### SKILL.md frontmatter

```yaml
---
name: my-skill # Optional — overrides directory name
description: One sentence. # Required — controls when Claude auto-invokes this skill
disable-model-invocation: true # Optional — makes skill user-only (no auto-invocation)
---
```

**`description` is the most important field.** Claude uses it to decide when to invoke the skill
automatically. Write it as a use-case sentence: what the skill does and when to use it. Bad:
`"PR creation"`. Good: `"Opens a pull request following common conventions... Use whenever
creating a PR — 'open a PR', 'create the PR', 'let's PR this'"`.

### `disable-model-invocation`

Set `disable-model-invocation: true` to stop Claude from auto-invoking the skill mid-conversation.
Use this for a skill that needs explicit user intent — a destructive operation, or one whose
output the user should trigger deliberately rather than have Claude reach for on its own. Omit it
for a skill Claude should discover and apply automatically.

### `$ARGUMENTS`

Use `$ARGUMENTS` anywhere in the skill body to capture text typed after the skill name:

```bash
/<plugin-name>:<skill-name> some text here
# $ARGUMENTS → "some text here"
```

If a skill needs no arguments, don't add `$ARGUMENTS` — calling with extra text is harmless.

### Writing effective skill bodies

**Don't duplicate CLAUDE.md content** in skills. CLAUDE.md is always loaded; skill bodies load only
when invoked — use skills for step-by-step procedures, use CLAUDE.md for always-on rules.

Each plugin's own `CLAUDE.md` carries rules specific to that plugin (e.g. `elite-dev`'s
stack-agnostic requirement) — check it before writing a skill for that plugin.

### Adding a new skill to an existing plugin

See the `add-plugin-skill` skill for the step-by-step procedure and checklist.

### Testing skills (evals)

Skills are natural-language instructions, not deterministic code, so they're tested with evals
rather than `tests/*.test.js`. See [docs/skill-evals.md](docs/skill-evals.md) for the schema, how
to write cases, how to run the with-skill/without-skill comparison, and what CI validates
automatically on every PR.

### Adding a new plugin to this repo

See the `add-new-plugin` skill for the step-by-step procedure.

---

## Hooks

`elite-ts` ships a lint/format hook; `elite-dev` ships no hooks. See
[docs/hooks-authoring.md](docs/hooks-authoring.md) for `hooks.json` format, path resolution, the
exit-code contract, matchers, timeouts, and the checklist for adding a new hook.

---

## Testing locally

Reference: [Test your plugins locally](https://code.claude.com/docs/en/plugins#test-your-plugins)

### Load a plugin for a session

```bash
claude --plugin-dir plugins/<plugin-name>
```

This loads that one plugin from its subdirectory without requiring installation. Skills appear as
`/<plugin-name>:<name>`.

### Reload without restarting

Inside an active session:

```shell
/reload-plugins
```

### Validate before release

```bash
claude plugin validate
```

This checks the root `marketplace.json` and every plugin's `plugin.json` in one pass — the same
checks the community marketplace review pipeline uses. Fix all validation errors before bumping a
version. Pass `--strict` to treat unrecognized-field warnings as errors.

---

## Versioning

Reference: [Version management](https://code.claude.com/docs/en/plugins-reference#version-management)

- Each plugin's `version` field is **independent** — bumping `elite-dev`'s version does not bump
  `elite-ts`'s, and vice versa.
- **Bump once, on the PR that introduces the change** — not on every commit during review, and not
  separately after merge. The version bump and the feature land together.
- Follow semver: `MAJOR.MINOR.PATCH`.
  - **PATCH**: wording fixes in a skill
  - **MINOR**: new skill
  - **MAJOR**: breaking change (renamed skill, changed behavior that affects how a consuming
    project must be set up)
- Do not bump version for changes to `README.md` or `CLAUDE.md` only — those don't affect plugin
  behavior and don't need a release.
- `marketplace.json` carries no version of its own — it always points at the current default
  branch and needs no bump when a plugin's version changes.

---

## marketplace.json

Reference: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

Rules:

- `source` is a relative path (`./plugins/<name>`) into this same repo, not a separate GitHub
  `repo` reference — both plugins live here now.
- Each `plugins[].name` must match the `name` field in that plugin's own `plugin.json` exactly.
- The top-level `name` (`"elitebusinesssolutions"`) is the marketplace identifier used in
  `claude plugin install <plugin-name>@elitebusinesssolutions`.
- Plugin install syntax is `<plugin-name>@<marketplace-name>`, not `<marketplace>/<plugin>`.

---

## npm workspaces

`elite-ts` carries its own `package.json`, tests, and lint config; the root `package.json` wires
it into one npm workspace so it can be run from the repo root with the standard `--workspaces`
flag. `elite-dev` has no npm tooling and is intentionally left out of `workspaces` — do not add an
empty `package.json` for a plugin that doesn't need one.

The root `package.json` also carries repo-wide scripts that aren't per-workspace (a shared eval
validator, root-level Prettier commands) — see its `scripts` object for the exact commands.

---

## Common mistakes

These are caught by `claude plugin validate` or by reading the official docs:

| Mistake                                                          | Correct approach                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Skill `description` that names the skill instead of the use-case | Write a sentence describing when to use it                                                  |
| Not bumping a plugin's `version` after a change                  | Bump version for every release of that plugin                                               |
| Hardcoding an org/repo name, default branch, or org-specific IDs | Resolve at runtime via `gh`; push org-specific IDs into the consuming project's `CLAUDE.md` |
| `plugin.json` `hooks` field pointing at `./hooks/hooks.json`     | Omit it — the standard file loads automatically; declaring it fails the plugin load         |

---

## Git workflow conventions

Reference: [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)

This repo has no `develop` branch — only `main`. Branch from and target `main`.

### Branch naming

Pattern: `<type>/<short-description>` — lowercase, hyphen-separated, ≤5 words.

Valid types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.

```bash
git checkout main && git pull origin main
git checkout -b feat/your-feature-name
```

### Conventional commit format

```text
<type>(<scope>): <description>
```

- **Type**: same values as branch types
- **Scope**: `<plugin-name>` or `<plugin-name>/<skill-name>` (e.g. `elite-dev/create-pr`,
  `elite-ts`) — or omit for changes that cross plugin boundaries
- **Description**: imperative, lowercase, ≤72 chars, no trailing period

Examples:

```text
feat(elite-dev/create-pr): add label-copy step
fix(elite-dev/start-issue): guard against a repo with no Projects board
chore: tighten stack-agnostic wording across elite-dev skills
```

Breaking changes — add `!` and a footer:

```text
feat(elite-dev/start-issue)!: require project-board IDs in consuming repo's CLAUDE.md

BREAKING CHANGE: consumer projects must now document their own board's field/option IDs
instead of relying on hardcoded ones.
```

### PR rules

- Title follows the same conventional commit format as the first commit on the branch
- Target branch is `main`
