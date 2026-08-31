---
name: verify
description: Type-check with tsc, lint with ESLint, check formatting with Prettier, and run the test suite for a TypeScript/JavaScript project. Use after finishing a coding task and before declaring it complete, or whenever asked to check that the project builds, lints, and passes its tests.
---

Verify that recent changes to this project are actually correct — don't just assume they are. Run each check below that applies to this project's actual setup, in order, and only declare the work done once every applicable check is clean.

## 1. Detect the package manager

Check the project root for a lockfile, in this order, and use the matching package manager for every run/exec command below:

| Lockfile present            | Package manager | Run a script      | Exec a local binary |
| ---------------------------- | --------------- | ----------------- | -------------------- |
| `pnpm-lock.yaml`             | pnpm            | `pnpm run <name>` | `pnpm exec <bin>`    |
| `yarn.lock`                  | Yarn            | `yarn <name>`     | `yarn <bin>`         |
| `package-lock.json` or none  | npm             | `npm run <name>`  | `npx <bin>`          |

The steps below show the npm form as the concrete example — substitute the detected manager's equivalent everywhere an `npm run` or `npx` command appears. No lockfile and no other signal (e.g. `package.json`'s `packageManager` field) defaults to npm.

## 2. Determine what applies

Skipping a check below because its precondition isn't met is correct behavior, not a failure to report — a plain-JS project with no `tsconfig.json` is not "failing" type-checking, it simply doesn't have any.

- `tsconfig.json` in the project root → type-check applies
- An ESLint config (`eslint.config.*`, `.eslintrc.*`, or an `eslintConfig` key in `package.json`) → lint applies
- `prettier` present as a devDependency (or a `.prettierrc*` / `prettier` key in `package.json`) → format applies
- A `test` script in `package.json`'s `scripts` → tests apply

If none of the four apply, say so plainly and stop — there is nothing to verify.

For lint and format, also confirm the tool is actually installed locally (`node_modules/.bin/eslint` / `node_modules/.bin/prettier`, walking up to a workspace root if this is a sub-package) before running it through the package manager's exec form. `npx <bin>` (and the pnpm/Yarn equivalents) fetches an unpinned package from the registry when no local binary exists — report the tool as missing instead of letting that fetch happen.

## 3. Lint

If lint applies via a legacy config (`.eslintrc.*` or an `eslintConfig` key in `package.json`, not a flat `eslint.config.*`), first check the installed ESLint version: read the `eslint` devDependency in `package.json`, or run `npx eslint --version`. ESLint 9 stops auto-loading legacy config by default, and ESLint 10 removes legacy config support entirely — a legacy-config project on either version will fail to lint at all, or fail with a confusing "no config found" error that has nothing to do with the code being checked. If the installed version is 9 or higher, report this mismatch plainly (legacy config, incompatible ESLint version) instead of running `eslint` and treating whatever it returns as a real lint result.

Otherwise, run `npx eslint --fix .`. This auto-fixes what it can; report any remaining errors verbatim (file, line, rule) — don't summarize a list of errors down to "a few lint issues."

## 4. Format

If format applies, run the project's `format` script if one exists (`npm run format`), otherwise `npx prettier --write --ignore-unknown .`. Report any file Prettier could not parse.

## 5. Type-check

If type-check applies, run `npx tsc --noEmit`. Report every error with its file and line — do not truncate the list or paraphrase it away.

## 6. Test

If tests apply, run `npm test`. Report the names of any failing tests along with their assertion output, not just a pass/fail count.

## 7. Report a verdict

State plainly which of the four checks ran, which were skipped and why, and whether the project is clean. If any applicable check still fails after steps 3–4's auto-fixes, do not declare the task complete: fix the actual issue (a type error, a failing test, an unfixable lint rule) yourself, then re-run this skill before finishing.
