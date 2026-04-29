import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import {
  deleteUserWire,
  loadUserWire,
  renameUserWire,
  saveUserWire,
  toSummary,
  WireNotFoundError,
  type WireSaveSource
} from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  try {
    const { id } = await context.params;
    const loaded = await loadUserWire(user, id);
    if (!loaded) return Response.json({ error: "Wire not found." }, { status: 404 });
    return Response.json({
      wire: toSummary(loaded.wire),
      diagram: loaded.diagram,
      validation: loaded.validation,
      chatMessages: loaded.wire.chatMessages
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<Response> {
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

  const payload = body as {
    diagram?: unknown;
    source?: unknown;
    title?: unknown;
  };

  try {
    const { id } = await context.params;
    if (typeof payload.title === "string" && payload.diagram === undefined) {
      const saved = await renameUserWire(user, id, payload.title);
      return Response.json({
        wire: toSummary(saved.wire),
        diagram: saved.diagram,
        validation: saved.validation
      });
    }

    if (payload.diagram === undefined) {
      return Response.json({ error: "diagram is required." }, { status: 400 });
    }

    const source = parseSource(payload.source);
    const saved = await saveUserWire({
      user,
      wireId: id,
      diagram: payload.diagram,
      source
    });

    return Response.json({
      wire: toSummary(saved.wire),
      diagram: saved.diagram,
      validation: saved.validation
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  try {
    const { id } = await context.params;
    await deleteUserWire(user, id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

function parseSource(value: unknown): WireSaveSource {
  if (value === "manual" || value === "json" || value === "reset" || value === "rename") return value;
  return "manual";
}

function errorResponse(err: unknown): Response {
  if (err instanceof WireNotFoundError) {
    return Response.json({ error: err.message }, { status: 404 });
  }
  return Response.json(
    { error: err instanceof Error ? err.message : String(err) },
    { status: 500 }
  );
}
