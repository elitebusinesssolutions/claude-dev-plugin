# claude-dev-plugin — Development Guide

This repo is a Claude Code plugin marketplace holding three plugins, each in its own subdirectory
under `plugins/`:

- **`elite-dev`** — generic dev-workflow skills (git worktrees, GitHub issues, pull requests) for
  any TypeScript/JavaScript or .NET repo. Skills only, no hooks. See its own
  [CLAUDE.md](plugins/elite-dev/CLAUDE.md).
- **`elite-next`** — shared skills and hooks for Next.js / TypeScript / .NET API projects. See its
  own `plugins/elite-next/CLAUDE.md`.
- **`elite-ts`** — shared lint/format hooks and formatting-setup/verification skills for
  TypeScript projects. See its own `plugins/elite-ts/CLAUDE.md`.

Install any of them via:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-dev@elitebusinesssolutions
claude plugin install elite-next@elitebusinesssolutions
claude plugin install elite-ts@elitebusinesssolutions
```

Official docs this file enforces:

- [Creating plugins](https://code.claude.com/docs/en/plugins)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Skills authoring](https://code.claude.com/docs/en/skills)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

---

## Directory layout

```text
claude-dev-plugin/
├── .claude-plugin/
│   └── marketplace.json        # catalog listing all three plugins
├── package.json                 # root, npm workspaces for elite-next and elite-ts
├── .github/workflows/ci.yml     # single workflow, runs across workspaces
└── plugins/
    ├── elite-dev/
    │   ├── .claude-plugin/plugin.json
    │   ├── skills/
    │   ├── README.md
    │   └── CLAUDE.md
    ├── elite-next/
    │   ├── .claude-plugin/plugin.json
    │   ├── skills/
    │   ├── hooks/
    │   ├── package.json
    │   ├── README.md
    │   └── CLAUDE.md
    └── elite-ts/
        ├── .claude-plugin/plugin.json
        ├── skills/
        ├── hooks/
        ├── package.json
        ├── README.md
        └── CLAUDE.md
```

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

Each plugin has its own `plugins/<name>/.claude-plugin/plugin.json`, e.g.:

```json
{
  "name": "elite-dev",
  "description": "Generic dev-workflow skills for git worktrees, GitHub issues, and pull requests",
  "version": "0.2.1",
  "repository": "https://github.com/elitebusinesssolutions/claude-dev-plugin",
  "skills": "./skills/"
}
```

Field rules:

| Field         | Rule                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | The namespace prefix — skills invoke as `/<name>:<skill>`. Keep it short, lowercase, hyphen-only.                                                                                                       |
| `version`     | Bump this with every release of that plugin. Users only get updates when the version field changes. Omitting it causes every commit to count as a new version, triggering reinstalls. Use semver.       |
| `description` | One sentence. Shown in the plugin manager.                                                                                                                                                              |
| `repository`  | This repo's URL (`https://github.com/elitebusinesssolutions/claude-dev-plugin`), same for all three plugins now that they share a repo.                                                                |
| `skills`      | Points at that plugin's own `./skills/` directory, relative to the plugin's own root — never a path into another plugin's directory.                                                                    |
| `hooks`       | Only set when the plugin has a `hooks/` directory (`elite-next`, `elite-ts`). Omit entirely otherwise — pointing it at a nonexistent file causes a load error.                                          |

---

## Skills

Reference: [Agent Skills](https://code.claude.com/docs/en/skills)

### File format

Every skill is a folder under a plugin's own `skills/` with a `SKILL.md`:

```text
plugins/<plugin-name>/skills/
└── my-skill/
    ├── SKILL.md          # Required — instructions + frontmatter
    └── reference.md      # Optional — large reference loaded on demand
```

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

### Writing effective skill bodies

1. **State the goal first.** Open with what Claude is doing, not with rules.
2. **Use numbered steps.** Skills run sequentially — numbered steps make progress checkable.
3. **Encode the decisions.** A skill that says "open a PR" is weaker than one that shows the exact
   body/label conventions to follow. Embed hard-won knowledge directly.
4. **Include examples.** Show correct output patterns, not just descriptions of them.
5. **End with a verification step.** Prevents Claude from finishing a skill in a broken state.
6. **Don't duplicate CLAUDE.md content** in skills. CLAUDE.md is always loaded; skill bodies load
   only when invoked — use skills for step-by-step procedures, use CLAUDE.md for always-on rules.

Each plugin's own `CLAUDE.md` carries rules specific to that plugin (e.g. `elite-dev`'s
stack-agnostic requirement) — check it before writing a skill for that plugin.

### Adding a new skill to an existing plugin

```bash
mkdir plugins/<plugin-name>/skills/<skill-name>
# Write plugins/<plugin-name>/skills/<skill-name>/SKILL.md
```

Test it:

```bash
claude --plugin-dir plugins/<plugin-name> /<plugin-name>:<skill-name>
```

Then run `/reload-plugins` inside an active session to pick up changes without restarting.

### Adding a new plugin to this repo

1. Create `plugins/<new-name>/.claude-plugin/plugin.json`, `plugins/<new-name>/skills/`,
   `plugins/<new-name>/README.md`, and `plugins/<new-name>/CLAUDE.md`.
2. Add an entry for it to the root `.claude-plugin/marketplace.json` (see below).
3. If it needs npm tooling, add its path to the root `package.json`'s `workspaces` array and give
   it its own `package.json`.
4. Add a row for it to the root `README.md`'s plugin index.

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
  `elite-next`'s or `elite-ts`'s, and vice versa.
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

```json
{
  "name": "elitebusinesssolutions",
  "owner": { "name": "elitebusinesssolutions" },
  "plugins": [
    { "name": "elite-dev", "source": "./plugins/elite-dev", "description": "..." },
    { "name": "elite-next", "source": "./plugins/elite-next", "description": "..." },
    { "name": "elite-ts", "source": "./plugins/elite-ts", "description": "..." }
  ]
}
```

Rules:

- `source` is a relative path (`./plugins/<name>`) into this same repo, not a separate GitHub
  `repo` reference — all three plugins live here now.
- Each `plugins[].name` must match the `name` field in that plugin's own `plugin.json` exactly.
- The top-level `name` (`"elitebusinesssolutions"`) is the marketplace identifier used in
  `claude plugin install <plugin-name>@elitebusinesssolutions`.
- Plugin install syntax is `<plugin-name>@<marketplace-name>`, not `<marketplace>/<plugin>`.

---

## npm workspaces

`elite-next` and `elite-ts` each carry their own `package.json`, tests, and lint config; the root
`package.json` wires them into one npm workspace so both can be run from the repo root:

```bash
npm install
npm test --workspaces --if-present
npm run lint --workspaces --if-present
```

`elite-dev` has no npm tooling and is intentionally left out of `workspaces` — do not add an empty
`package.json` for a plugin that doesn't need one.

---

## Common mistakes

These are caught by `claude plugin validate` or by reading the official docs:

| Mistake                                                          | Correct approach                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Putting a plugin's `skills/` inside its `.claude-plugin/`        | `skills/` goes at that plugin's own root                                                    |
| Sharing one `skills/` directory across plugins                   | Each plugin under `plugins/<name>/` keeps its own `skills/`                                 |
| Skill `description` that names the skill instead of the use-case | Write a sentence describing when to use it                                                  |
| Not bumping a plugin's `version` after a change                  | Bump version for every release of that plugin                                               |
| Hardcoding an org/repo name, default branch, or org-specific IDs | Resolve at runtime via `gh`; push org-specific IDs into the consuming project's `CLAUDE.md` |
| Install syntax `elitebusinesssolutions/elite-dev`                | Correct syntax is `elite-dev@elitebusinesssolutions` (`<plugin>@<marketplace>`)              |
| `plugin.json`'s `hooks` field pointing at a nonexistent file     | Omit the `hooks` field entirely if that plugin has no `hooks/` directory                    |
| A plugin referencing files outside its own directory via `../`  | Not allowed — keep every plugin self-contained under `plugins/<name>/`                      |

---

## Git workflow conventions

Reference: [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)

This repo has no `dev` branch — only `main`. Branch from and target `main`.

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
- Do not self-merge without review (exception: `chore`/`docs` branches)
