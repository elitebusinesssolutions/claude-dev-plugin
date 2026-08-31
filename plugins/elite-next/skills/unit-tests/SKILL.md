---
name: unit-tests
description: Writes Vitest unit tests for pure functions in src/. Use when you want to make sure business logic stays correct as code changes, or when a PR touches core logic without updating its tests.
---

You are writing unit tests for a Next.js / TypeScript project. The test framework is **Vitest** with a jsdom environment and `@testing-library/jest-dom` matchers. `describe`, `it`, `test`, and `expect` are globals — but still import them explicitly from `"vitest"` to match the existing convention in this project.

## Step 1 — Identify the target

If the user passed a file path or function name as an argument, use that. Otherwise look at `git diff dev...HEAD` to find what changed in `src/`, then ask which file to write tests for (or pick the most obvious candidate if there's only one).

Read the source file in full before writing a single test.

## Step 2 — Decide what to test

Focus on functions that are **pure or near-pure**: given the same inputs they return the same output with no side effects. These are the only functions worth unit-testing here — calls to the API client, React state, and UI interactions belong in integration or component tests, which are out of scope for this skill.

For each candidate function, identify:

- The **happy path** (typical inputs, expected output)
- **Edge cases**: empty arrays, zero values, missing optional fields, boundary values
- **Config/override variants**: if a function accepts a config object, test that overrides win over defaults
- **Invariants**: properties that must always hold (e.g. total === sum of parts)

Skip functions that are just thin wrappers around browser APIs or the API client — there's nothing to assert without mocking the world.

## Step 3 — Check for an existing test file

Look for a `*.test.ts` file adjacent to the source file. If it exists, read it so you don't duplicate tests that already exist. Add new `describe` blocks or cases to the existing file rather than creating a second file.

## Step 4 — Write the tests

Place the test file adjacent to the source (e.g. `src/features/<name>/<file>.test.ts` or `src/shared/lib/<file>.test.ts`).

```ts
import { describe, it, expect } from "vitest";
import { functionToTest } from "./filename";

describe("functionToTest — brief description of what this group covers", () => {
  it("describes the expected behavior in plain language", () => {
    // Arrange
    // Act
    const result = functionToTest(input);
    // Assert
    expect(result).toBe(expected);
  });
});
```

**Conventions to follow:**

- One `describe` block per function (or per logical behavior cluster if a function is complex)
- `it()` descriptions read as a sentence: _"returns 0 for an empty array"_, _"applies overnight rate when both conditions are met"_
- For floating-point results use `toBeCloseTo(value, decimalPlaces)` — not `toBe()`
- For object results use `toEqual()` — not `toBe()`
- Add a short comment above any assertion whose expected value is not obvious — show the arithmetic or logic so a future reader can verify it without re-running the function mentally
- Use named constants for fixture data so multiple tests share the same realistic baseline without repeating literals

**What to avoid:**

- Do not mock other `src/` functions — test the real implementations
- Do not test implementation details (private helper names, intermediate variables) — only test public exports and their observable outputs
- Do not write tests that will trivially always pass (e.g. `expect(true).toBe(true)`)

## Step 5 — Run and fix

Run `npm run test` to execute the full test suite. If any tests fail, read the error output, fix the test or the assertion (not the source code unless you found a genuine bug), and run again. Repeat until all tests pass.

If you discover a genuine bug in the source while writing tests, report it to the user — do not silently fix the source. The test should document the correct expected behavior; the user decides whether to fix the bug.

## Step 6 — Report

Tell the user:

- Which file was tested and what was already covered (if anything)
- How many new test cases were added and what behaviors they cover
- Whether all tests pass
- Any functions that were skipped and why (e.g. "skips `fetchQuote` — requires the API client")
