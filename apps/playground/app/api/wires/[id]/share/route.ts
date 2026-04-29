import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { createWireShareLinks, publicSharePayload, type ShareScope } from "@/lib/share-links-store";
import { loadUserWire, WireNotFoundError } from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  const options = await readShareOptions(req);

  try {
    const { id } = await context.params;
    const loaded = await loadUserWire(user, id);
    if (!loaded) return Response.json({ error: "Wire not found." }, { status: 404 });
    const links = await createWireShareLinks({
      user,
      wire: loaded.wire,
      scope: options.scope,
      pinRevision: options.pinRevision
    });
    return Response.json(publicSharePayload(req.nextUrl.origin, {
      wire: loaded.wire,
      view: links.view,
      edit: links.edit,
      legacyToken: loaded.wire.currentToken
    }));
  } catch (err) {
    if (err instanceof WireNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function readShareOptions(req: NextRequest): Promise<{ scope: ShareScope; pinRevision: boolean }> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const payload = body && typeof body === "object" ? body as { scope?: unknown; pinRevision?: unknown } : {};
  return {
    scope: payload.scope === "edit" ? "edit" : "view",
    pinRevision: payload.pinRevision === true
  };
}
