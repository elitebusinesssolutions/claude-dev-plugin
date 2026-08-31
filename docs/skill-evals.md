# Testing skills (evals)

Skills are natural-language instructions, not deterministic code — you can't unit-test them the
way `tests/*.test.js` tests a hook script. Instead, this repo uses the `skill-creator` plugin to
run **evals**: give the skill a few realistic prompts, run Claude with and without the skill, and
grade the responses against a checklist.

## Setup

`skill-creator@claude-plugins-official` is enabled at project scope (see the root
[`.claude/settings.json`](../.claude/settings.json)), so it's available to everyone working in
this repo. If it's ever missing:

```bash
claude plugin install skill-creator@claude-plugins-official --scope project
```

## Creating evals for a skill

Add `evals/evals.json` inside the skill's own directory (sibling to `SKILL.md`), e.g.
`plugins/<plugin-name>/skills/<skill-name>/evals/evals.json`:

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

Write 2-3 prompts per skill covering the common case plus at least one edge case (an ambiguous
request the skill should resolve without asking a redundant question, or a failure mode it should
troubleshoot correctly). Keep `expectations` objectively verifiable — "mentions running
`claude plugin list`" grades cleanly, "sounds helpful" doesn't.

## Running the eval

1. Before spawning any agent, copy that eval's `files` into per-run input folders:
   `skills/<skill-name>-workspace/iteration-1/<eval-name>/{with_skill,without_skill}/inputs/`.
   Point each agent at its own copy, never at the shared `skills/<skill-name>/evals/files/`
   originals — an agent that goes looking for "the project" on disk will find and edit whatever's
   in front of it, "please don't modify the original" is an instruction, not a permission
   boundary, and a stray edit to the shared fixture silently corrupts every other eval case that
   reuses it.
2. For each eval case, spawn two subagents in the same turn: one instructed to read the skill's
   `SKILL.md` and follow it (`with_skill`), one given the same prompt with no skill reference at
   all (`without_skill`, the baseline). Point each at its own `inputs/` copy from step 1. Save each
   response under `skills/<skill-name>-workspace/iteration-1/<eval-name>/{with_skill,without_skill}/outputs/`.
3. Grade each response against that eval's `expectations`, saving `grading.json` per run (see
   `skill-creator`'s `references/schemas.md` for the exact field names — the viewer depends on them
   matching exactly).
4. Aggregate into `benchmark.json` at the iteration root (pass rates, timing, tokens per
   configuration).
5. Generate the review page and open it as an artifact/static file:

   ```bash
   python <skill-creator-path>/eval-viewer/generate_review.py \
     skills/<skill-name>-workspace/iteration-1 \
     --skill-name <skill-name> \
     --benchmark skills/<skill-name>-workspace/iteration-1/benchmark.json \
     --static <output.html>
   ```

Ask Claude to "run the eval harness for `<skill-name>`" and it will do all of the above.
`<skill-name>-workspace/` is scratch output from that run — regenerate it locally rather than
committing it; it's gitignored.

## Iterating

If grading surfaces a real gap in the skill (not just a one-off phrasing issue), fix `SKILL.md`
and rerun into `iteration-2/`, passing `--previous-workspace iteration-1` to the viewer so you can
compare. Delete `<skill-name>-workspace/` once you're done — it's scratch output, not something to
keep committed long-term (unless you want to preserve a specific run as a regression fixture).

## CI

PR checks (`.github/workflows/ci.yml`) run **structural validation only** for any skill whose
files changed in the PR: `evals/evals.json`, if present, must be valid JSON matching the schema
above (non-empty `prompt` and `expectations` per eval). This runs through one shared script,
`scripts/validate-skill-evals.js`, across every plugin in one pass — `npm run validate-skill-evals
-- origin/main` runs the same check locally. CI does not spawn real `claude -p` calls or grade
responses — that requires an Anthropic API key and real token spend, so the qualitative
with-skill/without-skill run above stays a manual (Claude-assisted) step, not an automated gate.

## Project-local skills

Some skills are too project-specific to live in a shared plugin here (e.g. a skill scaffolding a
specific client project's own admin-card pattern). Keep those in `.claude/skills/` inside the
consumer project's own repo instead of adding them to a plugin here — a plugin in this repo stays
generic across every client project that installs it.
