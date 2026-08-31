# elite-ts

Shared Claude Code lint/format hooks and formatting-setup/verification skills for
TypeScript/JavaScript projects. Framework-agnostic — no Next.js or .NET assumptions.

```bash
claude plugin install elite-ts@elitebusinesssolutions
```

## Skills

| Skill              | Invoke                       | Purpose                                                                    |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| `setup-formatting` | `/elite-ts:setup-formatting` | Set up Prettier, ESLint auto-fix, EditorConfig, and VS Code format-on-save |
| `verify`           | `/elite-ts:verify`           | Type-check, lint, format-check, and run tests before declaring work done   |

## Hooks

Automatically wired when the plugin is enabled:

| Hook        | Trigger                | What it does                                       |
| ----------- | ---------------------- | -------------------------------------------------- |
| `format.js` | PostToolUse Write/Edit | Runs ESLint `--fix` + Prettier on every saved file |

See the root [README](../../README.md) for install/update/consumer-project setup shared by every
plugin in this repo, and the root [CLAUDE.md](../../CLAUDE.md) for how this repo is developed.
