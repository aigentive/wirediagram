import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { createUserApiKey, listUserApiKeys } from "@/lib/api-keys-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;
  const apiKeys = await listUserApiKeys(user);
  return Response.json({ apiKeys });
}

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const payload = body && typeof body === "object" ? body as { name?: unknown; scopes?: unknown } : {};
  const created = await createUserApiKey(user, payload);
  return Response.json(created);
}
