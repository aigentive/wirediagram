import { validate } from "@aigentive/wire-core";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Body must be JSON", { status: 400 });
  }
  const result = validate(body);
  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
