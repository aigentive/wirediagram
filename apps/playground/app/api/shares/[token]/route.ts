import type { NextRequest } from "next/server";
import {
  resolvePublicShare,
  saveEditableShare,
  ShareRateLimitError,
  shareUrls
} from "@/lib/share-links-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, context: RouteContext): Promise<Response> {
  const { token } = await context.params;
  const share = await resolvePublicShare(token, "view");
  if (!share) return Response.json({ error: "Share not found." }, { status: 404 });

  const viewToken = share.record?.viewToken ?? share.record?.token ?? share.legacyToken ?? token;
  return Response.json({
    diagram: share.diagram,
    scope: share.record?.scope ?? "view",
    viewToken,
    editToken: share.record?.scope === "edit" ? share.record.token : null,
    urls: shareUrls(req.nextUrl.origin, {
      viewToken,
      editToken: share.record?.scope === "edit" ? share.record.token : null,
      wireId: share.record?.wireId ?? null
    })
  });
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<Response> {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as { diagram?: unknown } : {};
  if (payload.diagram === undefined) {
    return Response.json({ error: "diagram is required." }, { status: 400 });
  }

  try {
    const saved = await saveEditableShare(token, payload.diagram);
    const viewToken = saved.record?.viewToken ?? saved.record?.token ?? token;
    return Response.json({
      diagram: saved.diagram,
      wire: saved.wire,
      scope: saved.record?.scope ?? "edit",
      viewToken,
      editToken: saved.record?.token ?? token,
      urls: shareUrls(req.nextUrl.origin, {
        viewToken,
        editToken: saved.record?.token ?? token,
        wireId: saved.record?.wireId ?? null
      })
    });
  } catch (err) {
    if (err instanceof ShareRateLimitError) {
      return Response.json(
        { error: err.message, code: "share-edit-rate-limited", retryAfterSeconds: err.retryAfterSeconds },
        { status: 429, headers: { "retry-after": String(err.retryAfterSeconds) } }
      );
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 422 }
    );
  }
}
