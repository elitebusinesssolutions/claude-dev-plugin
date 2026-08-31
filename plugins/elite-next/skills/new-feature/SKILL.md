---
name: new-feature
description: Scaffold a new feature folder following feature-based architecture. Use when starting work on a new user-facing capability that owns its own data, UI, and logic.
---

You are scaffolding a new feature for a Next.js / TypeScript application backed by a .NET API, following feature-based architecture. Every new capability lives in its own folder under `src/features/<name>/` — isolated, self-contained, and independently navigable.

## When to create a new feature folder

Create a new feature folder when you are adding a new user-facing capability that:

- Has its own data (reads from or writes to the .NET API)
- Has its own UI (one or more React components)
- Has its own logic (service functions, Server Actions, hooks, or types)

Do **not** create a new feature folder for:

- A new component inside an already-existing feature (add it to the existing feature folder)
- A utility or helper used across multiple features (add it to `src/shared/lib/`)
- A UI primitive (those belong in `src/shared/components/ui/`)

## Step 1 — Name the feature

Choose a short, lowercase, noun-based name (e.g. `quotes`, `notifications`, `billing`, `reports`). This becomes the folder name and the prefix for all service functions and type exports.

## Step 2 — Create the folder structure

Create the following at `src/features/<name>/`:

```text
src/features/<name>/
├── components/           ← React components used only by this feature
├── <Name>Service.ts      ← all .NET API calls for this feature (server-only)
├── actions.ts            ← Server Actions that Client Components can call (create when a mutation needs one)
└── types.ts              ← feature-specific TypeScript types (create when needed)
```

Start minimal — create `hooks/`, `actions.ts`, and `*.test.ts` files only when you have content to put in them. Do not create empty placeholder files.

## Step 3 — Create the service file

`<Name>Service.ts` is the only place in this feature that calls the generated API client directly. No component or Server Action in this feature should call `apiClient.` itself — all data access goes through the service.

```ts
// src/features/<name>/<Name>Service.ts
import "server-only";
import { createApiClient } from "@/lib/api/client";
import { getSessionToken } from "@/shared/lib/auth";
import type { components } from "@/lib/api/generated/schema";

type Entity = components["schemas"]["<EntityDto>"];

export async function getAll(): Promise<Entity[]> {
  const client = createApiClient(await getSessionToken());
  const { data, error } = await client.GET("/api/<entities>");
  if (error) throw error;
  return data;
}
```

Rules: explicit return types from the generated schema, `throw error` on failure, one function per operation, always `"server-only"` at the top.

## Step 4 — Create the first component

Place it at `src/features/<name>/components/<ComponentName>.tsx`. Keep it focused — one responsibility per component.

Prefer a **Server Component** that calls the service function directly — no client-side loading state needed for the initial fetch:

```tsx
// src/features/<name>/components/<ComponentName>.tsx
import { getAll } from "../<Name>Service";

export async function <ComponentName>() {
  const items = await getAll();
  if (items.length === 0) return <p>No <entities> yet.</p>;
  return (/* JSX rendering items */);
}
```

If the component needs client-side interactivity (forms, mutations, optimistic updates), mark it `"use client"` and call a Server Action instead of the service directly:

```ts
// src/features/<name>/actions.ts
"use server";
import { createRecord } from "./<Name>Service";

export async function createRecordAction(input: NewEntityInput) {
  await createRecord(input);
}
```

```tsx
// src/features/<name>/components/<ComponentName>Form.tsx
"use client";
import { toast } from "sonner";
import { createRecordAction } from "../actions";

export function <ComponentName>Form() {
  async function onSubmit(input: NewEntityInput) {
    try {
      await createRecordAction(input);
    } catch {
      toast.error("Failed to save <entity>");
    }
  }
  return (/* form JSX */);
}
```

## Step 5 — Wire it into the app

Import the component into the relevant route. The route file only renders the component — no data-fetching or business logic goes directly in `page.tsx`:

```tsx
// src/app/<route>/page.tsx
import { <ComponentName> } from "@/features/<name>/components/<ComponentName>";

export default function Page() {
  return <ComponentName />;
}
```

## Step 6 — The shared/ boundary

Code stays feature-local until it is genuinely used by **two or more features**. When that happens, move it:

- Pure logic → `src/shared/lib/<util>.ts`
- React components → `src/shared/components/<ComponentName>.tsx`

A feature folder must **never import from another feature folder**. Cross-feature dependencies always go through `src/shared/`. If you find yourself importing from `../other-feature/`, that is a signal to move the shared code first.

## Step 7 — What does NOT go in a feature folder

| Item                                     | Correct location            |
| ---------------------------------------- | --------------------------- |
| UI primitives (buttons, inputs, dialogs) | `src/shared/components/ui/` |
| Auth/session helpers (`getSessionToken`) | `src/shared/lib/auth.ts`    |
| Hand-written API client wrapper          | `src/lib/api/client.ts`     |
| Auto-generated OpenAPI types/client      | `src/lib/api/generated/`    |
| Shared Tailwind constants                | `src/shared/lib/styles.ts`  |

## Step 8 — Verify

```bash
npm run build
```

The build must pass. Also confirm:

- No feature folder imports from another feature folder
- All API calls are in `<Name>Service.ts`, not in components or route files
- No Client Component imports a `*Service.ts` file directly (it must go through a Server Action)
- Components handle empty and error states visibly — no blank sections with no feedback
