import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import {
  deleteUserOpenAIKey,
  getUserOpenAIKeyMeta,
  setUserOpenAIKey
} from "@/lib/user-openai-key-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;
  const meta = await getUserOpenAIKeyMeta(user);
  return Response.json(meta);
}

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Body must be an object." }, { status: 400 });
  }
  const payload = body as { key?: unknown };
  if (typeof payload.key !== "string" || payload.key.trim().length === 0) {
    return Response.json({ error: "Field 'key' is required." }, { status: 400 });
  }

  try {
    const meta = await setUserOpenAIKey(user, payload.key);
    return Response.json(meta);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;
  await deleteUserOpenAIKey(user);
  return Response.json({ configured: false, last4: null, updatedAt: null });
}
