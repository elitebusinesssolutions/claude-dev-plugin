---
name: ui-update
description: Safely update a UI component, Tailwind class string, style constant, or hardcoded value (a color, label, or class string copy-pasted into more than one component) everywhere it is used across the codebase — not just in the one file the user names. Finds all usages first, shows a plan, applies to every file, then verifies nothing was missed. Use when asked to change a button style, badge color, form layout, or any visual pattern that may exist in multiple places — including when the user says they already fixed one occurrence by hand and wants the rest found.
---

You are performing a safe, repo-wide UI update. Your job is to make sure the change is applied **everywhere** it needs to be — not just the one file the user mentioned.

## What the user passed

The user's argument (after `/elite-next:ui-update`) describes what to find and what to change. Examples:

- `/elite-next:ui-update Button size="sm"` — find all small buttons
- `/elite-next:ui-update ApprovalBadge` — find all usages of this component
- `/elite-next:ui-update STATUS_COLORS.approved` — find all references to this constant
- `/elite-next:ui-update "bg-amber-500/20 text-amber-700"` — find all hardcoded occurrences of this class string

If the user did not pass an argument, ask: "What component, class, or pattern do you want to update?"

---

## Step 1 — Find all usages

Search `src/` for every occurrence of the component name, class string, or pattern the user specified.

Use multiple search strategies to avoid missing instances:

- Exact string match on the component name or class string
- Partial match on the key distinguishing term
- Also search for the import of the component to find all consumers

List every file found with a one-line description of how it uses the pattern.

If nothing is found, say so clearly and stop.

---

## Step 2 — Check for shared style constants first

Before proposing any inline class changes, check whether the project has a shared styles file (e.g. `src/shared/lib/styles.ts`):

- If the pattern already has a named constant there, the fix is to **use the constant** in the files that have the raw string — not to change the string in every file independently.
- If the pattern does **not** have a constant yet and it appears in 3+ places, propose adding one before making any file edits. Explain that centralizing it makes future updates a one-line change.

---

## Step 3 — Show a plan

Before making any edits, output a plan:

```text
## UI Update Plan

**Pattern:** <what you searched for>
**Proposed change:** <old value> → <new value>

**Files to update:**
1. src/features/quotes/ApprovalBadge.tsx — uses raw class string on line 16
2. src/features/notifications/NotificationBell.tsx — colorFor() returns hardcoded value
3. src/features/admin/ShippingCostsCard.tsx — Label className on line 61

**Files already correct (no change needed):**
- src/shared/lib/styles.ts — source of truth, will update here first
```

Ask: **"Does this plan look right? Shall I proceed?"**

Wait for confirmation before editing anything.

---

## Step 4 — Apply the change

Update every file in the plan, starting with the shared styles file if a constant is being changed there.

For each file:

- Make the targeted edit (don't rewrite unrelated code)
- Confirm the file was updated

---

## Step 5 — Verify

After all edits, run a final search for the **old** pattern across `src/`:

- If **no results**: "All instances updated. The old pattern no longer exists in the codebase."
- If results remain: List the remaining files and ask whether to update them too. Do not mark the task complete while the old pattern still exists.
