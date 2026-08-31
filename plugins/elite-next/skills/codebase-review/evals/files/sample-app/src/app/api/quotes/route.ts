import { NextResponse } from "next/server";
import { API_BASE_URL, API_SERVICE_TOKEN } from "@/lib/config";

// Note: no session check before proxying to the .NET API (intentional gap for review purposes)
export async function GET() {
  const res = await fetch(`${API_BASE_URL}/api/quotes`, {
    headers: { Authorization: `Bearer ${API_SERVICE_TOKEN}` }
  });
  const data = await res.json();
  return NextResponse.json(data);
}
