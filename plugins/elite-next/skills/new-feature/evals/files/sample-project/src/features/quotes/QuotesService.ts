import "server-only";
import { createApiClient } from "@/lib/api/client";
import { getSessionToken } from "@/shared/lib/auth";
import type { components } from "@/lib/api/generated/schema";

type Quote = components["schemas"]["QuoteDto"];

export async function getAll(): Promise<Quote[]> {
  const client = createApiClient(await getSessionToken());
  const { data, error } = await client.GET("/api/quotes");
  if (error) throw error;
  return data;
}
