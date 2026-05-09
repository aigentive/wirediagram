import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { createUserWire, listUserWires, toSummary } from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;
  const wires = await listUserWires(user);
  return Response.json({ wires });
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

  const title =
    body && typeof body === "object" && "title" in body
      ? (body as { title?: unknown }).title
      : undefined;
  try {
    const created = await createUserWire(user, typeof title === "string" ? title : undefined);
    return Response.json({
      wire: toSummary(created.wire),
      diagram: created.diagram,
      validation: created.validation
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create wire.";
    return Response.json({ error: message }, { status: 500 });
  }
}
