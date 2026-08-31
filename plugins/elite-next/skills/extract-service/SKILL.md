---
name: extract-service
description: Moves .NET API calls out of page/component code into reusable service functions. Use when you see direct calls to the generated API client in a component or Server Action, or when you want to make API calls testable and reusable.
---

You are extracting calls to the generated .NET API client out of page/component code and into a service layer. This is the keystone step that makes Server Actions and components testable — service functions take plain values, run server-side, and return typed data with no React or UI concerns.

## Step 1 — Identify the target

If the user named a file, use that. Otherwise scan `git diff dev...HEAD` for files that import from `@/lib/api/client` or call `apiClient.` directly outside a `*Service.ts` file. Read the full target file before touching anything.

## Step 2 — Find every direct API call

Grep the target file for `apiClient.`, `.GET(`, `.POST(`, `.PUT(`, `.DELETE(` (the `openapi-fetch` call shape). List every call with its path, method, and purpose.

## Step 3 — Decide where each call belongs

Create the service file at `src/features/<domain>/<domain>Service.ts`. If the call is used across multiple features, place it in `src/shared/lib/<domain>Service.ts`. If a file already exists for that domain, append to it rather than creating a second file.

Group calls by the resource they access — one service file per domain (e.g. `quotesService.ts`, `crewService.ts`), not one per component. If a call touches an endpoint with no obvious domain home, create a sensibly named service file and note it to the user.

## Step 4 — Write the service functions

Service files run server-side only — they read the session to attach the bearer token, so start every one with the `"server-only"` guard. Each service function must follow this pattern exactly:

```ts
import "server-only";
import { createApiClient } from "@/lib/api/client";
import { getSessionToken } from "@/shared/lib/auth";
import type { components } from "@/lib/api/generated/schema";

type Entity = components["schemas"]["<EntityDto>"];

export async function getActiveEntities(): Promise<Entity[]> {
  const client = createApiClient(await getSessionToken());
  const { data, error } = await client.GET("/api/entities", {
    params: { query: { active: true } }
  });
  if (error) throw error;
  return data;
}
```

Rules:

- **Return type must be explicit** — derive it from the generated `components["schemas"][...]` type, or a `Pick<>` of it
- **Always `throw error`** on failure — no silent nulls
- **One function per logical operation** — don't bundle a fetch + create into one function
- **Name functions by action and entity**: `getActiveEntities`, `createRecord`, `updateStatus`
- **Never call `createApiClient` without a token** for an authenticated endpoint — an anonymous client silently returns 401s that look like empty data

If the original call had `.catch(() => {})` or silently ignored errors, do not carry that forward. The service function throws; the caller handles the error visibly (`toast.error()` in a Client Component, or an error boundary / redirect in a Server Component).

## Step 5 — Update the caller

Replace each inline `apiClient.` call with a call to the service function.

**Server Component or Server Action (the common case):** call the service function directly — no `useEffect`, no client-side loading state needed for the initial fetch.

```tsx
// Before — inline call in a Server Component
export default async function OrdersPage() {
  const client = createApiClient(await getSessionToken());
  const { data } = await client.GET("/api/orders");
  return <OrderList orders={data ?? []} />;
}

// After
import { getActiveOrders } from "@/features/orders/ordersService";

export default async function OrdersPage() {
  const orders = await getActiveOrders();
  return <OrderList orders={orders} />;
}
```

**Client Component that needs to trigger a mutation:** call a Server Action that wraps the service function — a Client Component must never import a `*Service.ts` file directly, since those files use `"server-only"` APIs (cookies/session) that don't exist in the browser.

```ts
// src/features/orders/actions.ts
"use server";
import { updateOrderStatus } from "./ordersService";

export async function updateOrderStatusAction(id: string, status: string) {
  await updateOrderStatus(id, status);
}
```

```tsx
// Client Component
import { updateOrderStatusAction } from "@/features/orders/actions";

async function handleClick() {
  try {
    await updateOrderStatusAction(order.id, "shipped");
  } catch {
    toast.error("Failed to update order status");
  }
}
```

## Step 6 — Verify

Run `npm run build`. If there are TypeScript errors, fix them — do not add `as any` casts. Run `npm run test` to confirm no regressions.

## Step 7 — Report

Tell the user:

- Which service file(s) were created or updated
- How many API calls were extracted
- Whether any errors were silently swallowed and are now surfaced
