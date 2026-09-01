---
name: add-plugin-skill
description: Add a new skill to an existing plugin in this repo (elite-dev or elite-ts) — creates the SKILL.md, wires it up, and checks it against this repo's conventions. Use when the user says "add a skill", "create a new skill for elite-dev/elite-ts", or similar.
---

Add a new skill to an existing plugin under `plugins/<plugin-name>/skills/`.

1. Create the skill directory and file:

   ```bash
   mkdir plugins/<plugin-name>/skills/<skill-name>
   # Write plugins/<plugin-name>/skills/<skill-name>/SKILL.md
   ```

2. Write `SKILL.md` with frontmatter (`name` optional, `description` required — see the root
   [CLAUDE.md](../../../CLAUDE.md#skills) for the frontmatter format) and a numbered-step body that
   encodes this repo's decisions and conventions, not just vague advice.

3. Check each item before considering the skill done:
   - [ ] Frontmatter has a `description` that explains when Claude should invoke it
   - [ ] Skill body uses numbered steps
   - [ ] Skill body encodes decisions and conventions (not just vague advice)
   - [ ] Skill ends with a verification step
   - [ ] Test with `claude --plugin-dir plugins/<plugin-name> /<plugin-name>:<skill-name>`
   - [ ] Add a row to that plugin's `README.md` skills table
   - [ ] Add `evals/evals.json` under the skill's own directory — see
         [docs/skill-evals.md](../../../docs/skill-evals.md)
   - [ ] Bump `PATCH`/`MINOR` version in that plugin's `plugin.json` as appropriate

4. If the plugin is `elite-dev`, also check the skill against
   [plugins/elite-dev/CLAUDE.md](../../../plugins/elite-dev/CLAUDE.md)'s stack-agnostic rule before
   calling it done.
