import type { NextRequest } from "next/server";
import { requireApiKeyUser } from "@/lib/api-keys-store";
import {
  createUserWire,
  createUserWireFromDiagram,
  listUserWires,
  toSummary
} from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const user = await requireApiKeyUser(req, ["wires:read"]);
  if (user instanceof Response) return user;
  const wires = await listUserWires(user);
  return Response.json({ wires });
}

export async function POST(req: NextRequest): Promise<Response> {
  const user = await requireApiKeyUser(req, ["wires:write"]);
  if (user instanceof Response) return user;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const payload = body && typeof body === "object"
    ? body as { title?: unknown; diagram?: unknown; preserveId?: unknown }
    : {};

  try {
    if (payload.diagram !== undefined) {
      const created = await createUserWireFromDiagram(user, payload.diagram, {
        preserveId: payload.preserveId !== false,
        summary: "Synced from local MCP."
      });
      return Response.json({
        wire: toSummary(created.wire),
        diagram: created.diagram,
        validation: created.validation
      });
    }

    const created = await createUserWire(user, typeof payload.title === "string" ? payload.title : undefined);
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
