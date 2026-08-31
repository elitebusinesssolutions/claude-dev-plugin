---
name: extract-component
description: Pulls a section out of a large page or feature file into its own standalone component. Use to shrink oversized files, make a feature independently editable, or prepare a section for testing.
---

You are extracting a section from a large file into a standalone sub-component. The goal is a component that is independently navigable, testable, and renderable — not just a renamed copy of the same tangle.

## Step 1 — Identify the target

If the user named a section, locate it in the source file. If not, ask which section to extract, or suggest the most self-contained candidate (sections with the least shared state are easiest).

Read the **entire** source file before making any changes. Large files have implicit dependencies between sections — state set in one place is used in another — and you must understand the full picture before moving anything.

## Step 2 — Audit the section's dependencies

For every piece of state, function, and imported value the section uses, classify it:

**Local** — used only within this section. Move it to the new component.

**Shared** — used by this section AND other sections of the page. Keep it in the parent and pass it as a prop.

**Setter only** — the section calls a `setState` that belongs to the parent. Pass the setter as a prop, or (better) pass a callback that wraps it.

Write out the full prop interface before writing any code. If a section needs more than ~8 props, that is a signal it is not ready to be extracted yet — it has too many dependencies on the surrounding page. In that case, report this to the user and suggest extracting the data fetching into a service first.

## Step 3 — Create the component file

Place the file at `src/features/<name>/components/<ComponentName>.tsx`. Use the section name as the component name, matching the naming style of existing components in the project.

```tsx
// src/features/<name>/components/<ComponentName>.tsx
import type { components } from "@/lib/api/generated/schema";

type Entity = components["schemas"]["<EntityDto>"];

interface <ComponentName>Props {
  // only what is genuinely shared with the parent
}

export function <ComponentName>({ ... }: <ComponentName>Props) {
  // state that was local to this section
  // data fetching that was local to this section
  // the JSX
}
```

## Step 4 — Handle data fetching

**If the section's API calls have already been extracted to a service function:** call the service function from inside the new component. If the new component is a Server Component, call it directly; if it's a Client Component, call a Server Action that wraps it.

**If the API calls are still inline:** move them into the new component as-is rather than leaving them in the page/route file. Do not leave the call split across the route file and the component. Inline calls in the new component are acceptable technical debt — they are now isolated to one file and can be extracted to a service in a follow-up.

Do not add new direct calls to the generated API client in route files. The flow of debt is one direction: out of the route file, into components, eventually into services.

## Step 5 — Replace the section in the route file

Remove the extracted JSX and state from the route file. Replace with the new component, passing the necessary props:

```tsx
// page.tsx — after extraction
<ComponentName onItemSelected={handleItemSelected} selectedId={id} />
```

The route file should be strictly smaller after this change. If it is not, something was left behind or new state was added — investigate before committing.

## Step 6 — Verify

Run `npm run build`. Fix any TypeScript errors without adding `as any` casts. Visually verify the extracted section still renders and behaves correctly — run `npm run dev` and exercise the feature.

## Step 7 — Report

Tell the user:

- The new file path
- The prop interface
- Approximate line reduction in the page file
- Any state that could not be cleanly extracted and why
