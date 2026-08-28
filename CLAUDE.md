# claude-dev-plugin — Development Guide

This is the elite-dev Claude Code plugin. It ships generic dev-workflow skills — git worktrees,
GitHub issue tracking, pull requests, PR review triage — for any TypeScript/JavaScript or .NET
repo. No hooks, skills only. Install it via:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-dev@elite-dev-marketplace
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
│   ├── plugin.json          # Plugin identity (name, version, description)
│   └── marketplace.json     # elite-dev marketplace registration
├── skills/
│   ├── create-pr/SKILL.md
│   ├── review-fix-pr-comments/SKILL.md
│   ├── setup-worktree/SKILL.md
│   └── start-issue/SKILL.md
└── README.md
```

**Rules enforced by the official spec:**

- `.claude-plugin/` holds only `plugin.json` and `marketplace.json`. Never put `skills/`, `hooks/`,
  `agents/`, or scripts inside `.claude-plugin/`.
- `skills/` must be at the plugin root, not nested inside `.claude-plugin/`.
- Each skill is a directory containing exactly one `SKILL.md` — the directory name becomes the
  skill's invocation name (e.g., `skills/create-pr/SKILL.md` → `/elite-dev:create-pr`).

---

## plugin.json

Reference: [Plugin manifest schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema)

```json
{
  "name": "elite-dev",
  "description": "Generic dev-workflow skills for git worktrees, GitHub issues, and pull requests",
  "version": "0.1.0",
  "repository": "https://github.com/elitebusinesssolutions/claude-dev-plugin",
  "skills": "./skills/"
}
```

Field rules:

| Field         | Rule                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | The namespace prefix — skills invoke as `/elite-dev:<skill>`. Keep it short, lowercase, hyphen-only.                                                                                                    |
| `version`     | Bump this with every release. Users only get updates when the version field changes. Omitting it causes every commit to count as a new version, triggering reinstalls. Use semver: `MAJOR.MINOR.PATCH`. |
| `description` | One sentence. Shown in the plugin manager.                                                                                                                                                              |
| `repository`  | Full GitHub URL. Required for marketplace distribution.                                                                                                                                                 |
| `skills`      | Optional. Points to a custom skill directory; adds to (not replaces) the default `skills/` scan. Our value `"./skills/"` is the default location — redundant but harmless.                              |

Claude Code ignores unrecognized fields and reports extra fields as warnings (not errors) from
`claude plugin validate`. This plugin has no `hooks/` directory, so omit the `hooks` field
entirely — pointing it at a nonexistent file causes a load error.

---

## Skills

Reference: [Agent Skills](https://code.claude.com/docs/en/skills)

### File format

Every skill is a folder under `skills/` with a `SKILL.md`:

```text
skills/
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

### Stay stack-agnostic

Every skill in this repo must work for a plain TypeScript/JavaScript repo, a Next.js app, a .NET
solution, or a mix (a `src/client` + `src/server` monorepo). Never hardcode:

- An org/repo name — resolve it from `gh repo view` or rely on `gh`'s cwd-based inference (no
  `--repo` flag needed inside a checkout).
- A default branch name — check `gh repo view --json defaultBranchRef` rather than assuming `main`
  or `develop`.
- A build/test/lint command — check `package.json` scripts or the project's build tooling
  (`dotnet build`, etc.) rather than assuming one toolchain.
- Org-specific IDs (a GitHub Projects board's field/option node IDs, a specific label set) —
  these belong in the _consuming_ project's own `CLAUDE.md`, looked up once per project. See
  `start-issue/SKILL.md` for the pattern.

### Writing effective skill bodies

1. **State the goal first.** Open with what Claude is doing, not with rules.
2. **Use numbered steps.** Skills run sequentially — numbered steps make progress checkable.
3. **Encode the decisions.** A skill that says "open a PR" is weaker than one that shows the exact
   body/label conventions to follow. Embed hard-won knowledge directly.
4. **Include examples.** Show correct output patterns, not just descriptions of them.
5. **End with a verification step.** Prevents Claude from finishing a skill in a broken state.
6. **Don't duplicate CLAUDE.md content** in skills. CLAUDE.md is always loaded; skill bodies load
   only when invoked — use skills for step-by-step procedures, use CLAUDE.md for always-on rules.

### Adding a new skill

```bash
mkdir skills/<skill-name>
# Write skills/<skill-name>/SKILL.md
```

Test it:

```bash
claude --plugin-dir . /elite-dev:<skill-name>
```

Then run `/reload-plugins` inside an active session to pick up changes without restarting.

---

## Testing locally

Reference: [Test your plugins locally](https://code.claude.com/docs/en/plugins#test-your-plugins)

### Load the plugin for a session

```bash
claude --plugin-dir .
```

This loads the plugin from the current directory without requiring installation. Skills appear as
`/elite-dev:<name>`.

### Reload without restarting

Inside an active session:

```shell
/reload-plugins
```

### Validate before release

```bash
claude plugin validate
```

This runs the same checks the community marketplace review pipeline uses. Fix all validation
errors before bumping the version. Pass `--strict` to treat unrecognized-field warnings as errors.

---

## Versioning

Reference: [Version management](https://code.claude.com/docs/en/plugins-reference#version-management)

- The `version` field in `plugin.json` controls when users receive updates.
- **Bump once, on the PR that introduces the change** — not on every commit during review, and not
  separately after merge. The version bump and the feature land together.
- Follow semver: `MAJOR.MINOR.PATCH`.
  - **PATCH**: wording fixes in a skill
  - **MINOR**: new skill
  - **MAJOR**: breaking change (renamed skill, changed behavior that affects how a consuming
    project must be set up)
- Do not bump version for changes to `README.md` or `CLAUDE.md` only — those don't affect plugin
  behavior and don't need a release.
- After bumping version, update the `marketplace.json` if needed (it doesn't carry a version — it
  points to the repo).

---

## marketplace.json

Reference: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

```json
{
  "name": "elite-dev-marketplace",
  "owner": { "name": "elitebusinesssolutions" },
  "plugins": [
    {
      "name": "elite-dev",
      "source": {
        "source": "github",
        "repo": "elitebusinesssolutions/claude-dev-plugin"
      }
    }
  ]
}
```

Rules:

- Do not add `version` to `marketplace.json` — the marketplace always points to the current
  default branch.
- The `name` in `marketplace.json → plugins[].name` must match the `name` field in `plugin.json`
  exactly (`"elite-dev"`).
- The top-level `name` (`"elite-dev-marketplace"`) is the marketplace identifier used in
  `claude plugin install elite-dev@elite-dev-marketplace`.
- Plugin install syntax is `<plugin-name>@<marketplace-name>`, not `<marketplace>/<plugin>`.

---

## Common mistakes

These are caught by `claude plugin validate` or by reading the official docs:

| Mistake                                                          | Correct approach                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Putting `skills/` inside `.claude-plugin/`                       | `skills/` goes at the plugin root                                                           |
| Skill `description` that names the skill instead of the use-case | Write a sentence describing when to use it                                                  |
| Not bumping `version` after a change                             | Bump version for every release                                                              |
| Hardcoding an org/repo name, default branch, or org-specific IDs | Resolve at runtime via `gh`; push org-specific IDs into the consuming project's `CLAUDE.md` |
| Assuming every consumer project is TypeScript or .NET-only       | Write skills so both stacks work — see [Stay stack-agnostic](#stay-stack-agnostic)          |
| Install syntax `elite-dev-marketplace/elite-dev`                 | Correct syntax is `elite-dev@elite-dev-marketplace` (`<plugin>@<marketplace>`)              |
| `plugin.json`'s `hooks` field pointing at a nonexistent file     | Omit the `hooks` field — this plugin has no `hooks/` directory                              |

---

## Git workflow conventions

Reference: [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/)

This repo (`claude-dev-plugin`) has no `dev` branch — only `main`. Branch from and target `main`.

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
- **Scope**: a skill name (`create-pr`, `start-issue`, ...) — or omit for cross-cutting changes
- **Description**: imperative, lowercase, ≤72 chars, no trailing period

Examples:

```text
feat(skills): add label-copy step to create-pr
fix(start-issue): guard against a repo with no Projects board
chore: tighten stack-agnostic wording across skills
```

Breaking changes — add `!` and a footer:

```text
feat(start-issue)!: require project-board IDs in consuming repo's CLAUDE.md

BREAKING CHANGE: consumer projects must now document their own board's field/option IDs
instead of relying on hardcoded ones.
```

### PR rules

- Title follows the same conventional commit format as the first commit on the branch
- Target branch is `main`
- Do not self-merge without review (exception: `chore`/`docs` branches)

---

## Adding a new skill checklist

- [ ] Create `skills/<name>/SKILL.md`
- [ ] Frontmatter has a `description` that explains when Claude should invoke it
- [ ] Skill body uses numbered steps
- [ ] Skill body encodes decisions and conventions (not just vague advice)
- [ ] No hardcoded org/repo name, default branch, or org-specific IDs — see [Stay stack-agnostic](#stay-stack-agnostic)
- [ ] Skill ends with a verification step
- [ ] Test with `claude --plugin-dir . /elite-dev:<name>`
- [ ] Add row to `README.md` skills table
- [ ] Bump `PATCH`/`MINOR` version in `plugin.json` as appropriate
