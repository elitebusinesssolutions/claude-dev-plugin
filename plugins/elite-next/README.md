# claude-next-plugin

Shared Claude Code skills and hooks for Next.js / TypeScript / .NET API projects.

## Install

This is the personal, one-machine install path. It works the same way whether or not the repo you're in has a committed `.claude/settings.json` — it's an explicit command, not something that depends on trust-dialog auto-detection (see [Consumer project setup](#consumer-project-setup-recommended) below for why that distinction matters). Run it once per machine per person; it doesn't reach anyone else's setup.

Add the marketplace:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-next-plugin
```

Then install the plugin:

```bash
claude plugin install elite-next@elite-next-marketplace
```

This plugin can also be used with [copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing) by replacing `claude` with `copilot`. E.g.

```bash
copilot plugin marketplace add elitebusinesssolutions/claude-next-plugin
copilot plugin install elite-next@elite-next-marketplace
```

## Update

```bash
claude plugin marketplace update elite-next-marketplace
```

This refreshes the marketplace catalog only — follow it with `claude plugin update elite-next@elite-next-marketplace` to actually pull the new version. This manual pair always works regardless of whether `autoUpdate` is set anywhere; use it any time you don't want to wait for the next automatic startup check, or to confirm an update actually landed. See `/elite-next:update-plugin`, which automates this end-to-end including the project-scope case.

## Consumer project setup (recommended)

Running `claude plugin install` locally only configures your own machine — it doesn't reach any of your teammates', and each person has to repeat it themselves. For a team project, commit this to the project's own `.claude/settings.json` instead, so the plugin is declared for everyone who opens the repo:

```json
{
  "extraKnownMarketplaces": {
    "elite-next-marketplace": {
      "source": {
        "source": "github",
        "repo": "elitebusinesssolutions/claude-next-plugin"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "elite-next@elite-next-marketplace": true
  }
}
```

If the project doesn't have a `.claude/settings.json` yet, create it with just this content. If it already has one — for anything, not just this plugin's own hooks — merge `extraKnownMarketplaces` and `enabledPlugins` in as additional top-level keys; don't replace the file. This repo's own [`.claude/settings.json`](.claude/settings.json) is a working example of `enabledPlugins` sitting alongside an unrelated `hooks` block.

This does **not** reliably auto-install the plugin — declaring it in `settings.json` only makes Claude Code aware the project wants it. The [docs](https://code.claude.com/docs/en/discover-plugins) say trusting the folder "prompts them to install," but in practice this has been reported to silently do nothing beyond registering the marketplace — no install prompt fires, `enabledPlugins` is never acted on, and the plugin's skills stay unavailable ([anthropics/claude-code#32606](https://github.com/anthropics/claude-code/issues/32606)). It's also **only evaluated through the interactive trust dialog** — it does nothing in headless/print mode (`-p`), including in CI ([anthropics/claude-code#13097](https://github.com/anthropics/claude-code/issues/13097)). The CLAUDE.md snippet below closes both gaps by having Claude proactively offer the install the first time it's needed (and run it with the user's go-ahead), instead of depending on a prompt that may never fire.

Once installed, `autoUpdate: true` keeps that installation current without anyone manually running `claude plugin marketplace update` — third-party marketplaces default to auto-update off.

Also add this to the project's own `CLAUDE.md`. This is what actually closes the install gap described above for non-technical teammates: instead of a human having to notice the "plugin not installed" message and copy the command themselves, Claude offers to install it the first time it needs an elite-next skill, and runs the commands itself once the user agrees:

```markdown
## elite-next Claude Plugin

This project uses the `elite-next@elite-next-marketplace` Claude Code plugin for shared skills (`/elite-next:codebase-review`, `/elite-next:new-feature`, etc.) and hooks. It's declared in `.claude/settings.json`, but Claude Code does not auto-install a plugin from settings alone — it only reports the plugin as not installed and shows the install command. No one should need to notice that message or run install commands themselves.

If a user describes something an elite-next skill would normally handle (e.g. "review this codebase," "scaffold a new feature," "write tests for this function") and the matching skill isn't available or the `elite-next` plugin isn't installed:

- Don't just report the plugin as missing and stop — that leaves the user to notice the message and copy the command themselves, which is the exact gap this fallback exists to close.
- Tell them in plain language what's missing and offer to install it (`claude plugin marketplace add elitebusinesssolutions/claude-next-plugin` and `claude plugin install elite-next@elite-next-marketplace`) — then, if they agree, run those commands yourself rather than making them type it.
- This changes machine-wide Claude Code state, not just this project, so treat it like any other consequential action: propose it, don't do it silently.

Don't rely on the user typing `/elite-next:<skill-name>` directly. If that skill doesn't resolve, the client rejects the slash command before it ever reaches you, so this fallback never gets a chance to run — it only helps when they describe what they want in plain English.
```

Caveats to know about before relying on this:

- **Each teammate still has one unavoidable one-time step**: accepting the workspace trust dialog on their own machine the first time they open the project. Nothing here removes that.
- **`autoUpdate: true` only helps once the plugin is actually installed.** It keeps an existing install current at every startup — it does not perform the initial install, which is exactly the step the caveat above says isn't reliable. Someone (or Claude, via the CLAUDE.md fallback) still has to get the plugin installed once; `autoUpdate` takes it from there.
- **Claude Code Desktop has a filed bug** ([anthropics/claude-code#61782](https://github.com/anthropics/claude-code/issues/61782)) where the workspace trust dialog can silently fail to render, blocking the chat entirely with no prompt to accept. If someone hits this, nothing above can help — they'd need to trust that same repo once via another Claude Code surface (CLI or an IDE extension), since trust is stored per git repository root, not per surface.

## Developing this plugin

To try a skill from this repo before it's released, load it unreleased with:

```bash
claude --plugin-dir .
```

then invoke it as `/elite-next:<skill-name>` and run `/reload-plugins` after edits to pick up changes without restarting.

**This only works from a plain terminal, not the VS Code extension.** The VS Code extension launches its own managed `claude` process and has no setting to pass `--plugin-dir` (or any extra CLI flag) to it. If you're working in the VS Code extension, open a separate integrated or external terminal and run the command above there — it starts an independent CLI session, not the extension's chat panel. Hooks don't have this limitation: `.claude/settings.json` wires this repo's own hooks up directly via `${CLAUDE_PROJECT_DIR}`, so they run in any session (including the VS Code extension) without needing `--plugin-dir`.

## Skills

| Skill               | Invoke                          | Purpose                                                                           |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `codebase-review`   | `/elite-next:codebase-review`   | Full-codebase audit: security, performance, best practices (for vibe-coded apps)  |
| `extract-component` | `/elite-next:extract-component` | Pull a section out of a large file into a standalone component                    |
| `extract-service`   | `/elite-next:extract-service`   | Move inline .NET API client calls into a service layer                            |
| `find-usages`       | `/elite-next:find-usages`       | Find every file that uses a component, function, or class string                  |
| `git-workflow`      | `/elite-next:git-workflow`      | Create a feature branch, write a conventional commit, and open a PR against `dev` |
| `new-feature`       | `/elite-next:new-feature`       | Scaffold a new feature folder following feature-based architecture                |
| `pr-review`         | `/elite-next:pr-review`         | Full PR review: conventions, security, code quality, docs accuracy                |
| `setup-env-local`   | `/elite-next:setup-env-local`   | Write API_BASE_URL to .env.local for local .NET API development                   |
| `ui-update`         | `/elite-next:ui-update`         | Safely apply a UI change everywhere it appears across the repo                    |
| `unit-tests`        | `/elite-next:unit-tests`        | Write Vitest unit tests for pure functions in src/                                |
| `update-plugin`     | `/elite-next:update-plugin`     | Update the installed elite-next plugin to the latest marketplace version          |

## Hooks

Automatically wired when the plugin is enabled:

| Hook                   | Trigger                | What it does                                                                                                                                                |
| ---------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protect-generated.js` | PreToolUse Write/Edit  | Blocks edits to the auto-generated OpenAPI client/types; warns before editing a locally-synced OpenAPI spec file                                            |
| `post-write-checks.js` | PostToolUse Write/Edit | Flags `as any`, `window.confirm()`, silent `.catch`, inline `style={{}}`, direct API client use in pages/routes, hardcoded secrets; notes related importers |

Lint/format (ESLint + Prettier) and type-check/test-on-Stop hooks moved to the separate [claude-typescript-plugin](https://github.com/elitebusinesssolutions/claude-typescript-plugin) — install it alongside this plugin if you want that coverage; it isn't a dependency of this one.

## Testing skills (evals)

Skills are natural-language instructions, not deterministic code — you can't unit-test them the way `tests/*.test.js` tests the hooks. Instead, this repo uses the `skill-creator` plugin to run **evals**: give the skill a few realistic prompts, run Claude with and without the skill, and grade the responses against a checklist.

### Setup

`skill-creator@claude-plugins-official` is enabled at project scope (see `.claude/settings.json`), so it's available to everyone working in this repo. If it's ever missing:

```bash
claude plugin install skill-creator@claude-plugins-official --scope project
```

### Creating evals for a skill

Add `evals/evals.json` inside the skill's own directory (sibling to `SKILL.md`), e.g. `skills/<skill-name>/evals/evals.json`:

```json
{
  "skill_name": "<skill-name>",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user prompt that should exercise the skill",
      "expected_output": "One-sentence description of what a good response looks like",
      "files": [],
      "expectations": [
        "An objectively checkable statement about the response",
        "Another one — these become the grading checklist"
      ]
    }
  ]
}
```

Write 2-3 prompts per skill covering the common case plus at least one edge case (an ambiguous request the skill should resolve without asking a redundant question, or a failure mode it should troubleshoot correctly). Keep `expectations` objectively verifiable — "mentions running `claude plugin list`" grades cleanly, "sounds helpful" doesn't.

### Running the eval

1. Before spawning any agent, copy that eval's `files` into per-run input folders: `skills/<skill-name>-workspace/iteration-1/<eval-name>/{with_skill,without_skill}/inputs/`. Point each agent at its own copy, never at the shared `skills/<skill-name>/evals/files/` originals — an agent that goes looking for "the project" on disk will find and edit whatever's in front of it, "please don't modify the original" is an instruction, not a permission boundary, and a stray edit to the shared fixture silently corrupts every other eval case that reuses it.
2. For each eval case, spawn two subagents in the same turn: one instructed to read the skill's `SKILL.md` and follow it (`with_skill`), one given the same prompt with no skill reference at all (`without_skill`, the baseline). Point each at its own `inputs/` copy from step 1. Save each response under `skills/<skill-name>-workspace/iteration-1/<eval-name>/{with_skill,without_skill}/outputs/`.
3. Grade each response against that eval's `expectations`, saving `grading.json` per run (see `skill-creator`'s `references/schemas.md` for the exact field names — the viewer depends on them matching exactly).
4. Aggregate into `benchmark.json` at the iteration root (pass rates, timing, tokens per configuration).
5. Generate the review page and open it as an artifact/static file:

   ```bash
   python <skill-creator-path>/eval-viewer/generate_review.py \
     skills/<skill-name>-workspace/iteration-1 \
     --skill-name <skill-name> \
     --benchmark skills/<skill-name>-workspace/iteration-1/benchmark.json \
     --static <output.html>
   ```

Ask Claude to "run the eval harness for `<skill-name>`" and it will do all of the above. `<skill-name>-workspace/` is scratch output from that run — regenerate it locally rather than committing it; it's gitignored.

### Iterating

If grading surfaces a real gap in the skill (not just a one-off phrasing issue), fix `SKILL.md` and rerun into `iteration-2/`, passing `--previous-workspace iteration-1` to the viewer so you can compare. Delete `<skill-name>-workspace/` once you're done — it's scratch output, not something to keep committed long-term (unless you want to preserve a specific run as a regression fixture).

### CI

PR checks (`.github/workflows/ci.yml`) run **structural validation only** for any skill whose files changed in the PR: `evals/evals.json`, if present, must be valid JSON matching the schema above (non-empty `prompt` and `expectations` per eval). CI does not spawn real `claude -p` calls or grade responses — that requires an Anthropic API key and real token spend, so the qualitative with-skill/without-skill run above stays a manual (Claude-assisted) step, not an automated gate.

## Project-local skills

Some skills are too project-specific to live here (e.g. a skill scaffolding a specific client project's own admin-card pattern). Keep those in `.claude/skills/` inside the consumer project's own repo instead of adding them here — this repo stays generic across every client project that installs it.
