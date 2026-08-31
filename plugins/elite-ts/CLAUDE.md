# elite-ts — Development Guide

`elite-ts` ships a lint/format hook plus formatting-setup/verification skills for any
TypeScript/JavaScript project. No Next.js and no .NET assumptions.

Install it via:

```bash
claude plugin marketplace add elitebusinesssolutions/claude-dev-plugin
claude plugin install elite-ts@elitebusinesssolutions
```

For the repo-wide layout, `plugin.json`/`marketplace.json` field rules, `SKILL.md` authoring
format, hook mechanics, versioning policy, and git workflow conventions shared by every plugin in
this repo, see the root [CLAUDE.md](../../CLAUDE.md) and [docs/hooks-authoring.md](../../docs/hooks-authoring.md).
This file covers only what is specific to `elite-ts`.

---

## Skills

- `setup-formatting`
- `verify`

---

## Hooks

- `format.js` — `PostToolUse` on `Write|Edit`. Runs ESLint auto-fix, then Prettier.

`format.js` guards each tool on its own presence: it runs ESLint only when it finds an `eslint`
binary by walking up from the working directory, and Prettier only when it finds a `prettier`
binary the same way. A plain JavaScript project missing one of them gets no spurious failure.

`skills/setup-formatting/SKILL.md` embeds `hooks/format.js` verbatim, and
`tests/skill-docs-sync.test.js` fails the moment the two drift — edit both together.

---

## Stay stack-agnostic

Every skill and hook in this plugin must work for any TypeScript or JavaScript project. Never
assume Next.js or .NET.

---

## Testing locally

```bash
claude --plugin-dir plugins/elite-ts
```

Skills appear as `/elite-ts:<name>`. Reload after a change without restarting: `/reload-plugins`.
