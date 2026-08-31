---
name: find-usages
description: Find every file that uses a component, function, constant, or class string across the codebase. Use before editing anything UI-related to know the full scope of the change. Lighter-weight than /ui-update — this only searches, it does not edit.
---

You are performing a usage search across the codebase. Your job is to find **every** place the given pattern appears before any editing begins.

## What the user passed

The argument after `/elite-next:find-usages` is what to search for. Examples:

- `/elite-next:find-usages ApprovalBadge` — find all imports and JSX usages of this component
- `/elite-next:find-usages STATUS_COLORS` — find all consumers of this constant
- `/elite-next:find-usages "flex items-center gap-4"` — find all files with this literal class string
- `/elite-next:find-usages DollarInput` — find all usages of this form helper

If no argument was given, ask: "What component, constant, or string do you want to find?"

---

## Search strategy

Run at least two complementary searches to avoid missing instances:

1. **Exact match** — search for the literal string in `src/`
2. **Import search** — search for `import.*<Name>` to find all files that import it
3. **Alias / re-export check** — if the first two return few results, also check whether the symbol is re-exported from an index file

---

## Output format

```text
## Usages of `<pattern>`

Found in **N files**:

| File | How it's used |
|---|---|
| src/features/quotes/ApprovalBadge.tsx | defines the component |
| src/app/dashboard/page.tsx | renders <ApprovalBadge snap={...} /> on line 412 |
| src/features/admin/PendingApprovalsCard.tsx | renders <ApprovalBadge> in the approvals list |

**Also check:** src/shared/lib/styles.ts — `STATUS_COLORS` drives badge colors here
```

If nothing is found, say so clearly and suggest alternative search terms.

---

## After the results

Always end with one of these follow-up prompts based on what you found:

- If the pattern exists in **1 file**: "Only one usage found — safe to edit directly."
- If the pattern exists in **2–5 files**: "Found in N files. Want me to run `/elite-next:ui-update` to apply a change to all of them?"
- If the pattern exists in **6+ files**: "Found in N files — this is widespread. Recommend adding a shared constant to `src/shared/lib/styles.ts` before editing. Want me to plan that with `/elite-next:ui-update`?"
- If the pattern is **already a constant in `styles.ts`**: "This is already centralized in `styles.ts`. Editing the constant there will propagate the change to all N consumers automatically."
