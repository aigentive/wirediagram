import type { NextRequest } from "next/server";
import { requireApiKeyUser } from "@/lib/api-keys-store";
import {
  createWireShareLinks,
  listWireShareLinks,
  publicSharePayload,
  rotateWireShareLink,
  revokeWireShareLink,
  shareUrls,
  type ShareScope
} from "@/lib/share-links-store";
import { loadUserWire, WireNotFoundError } from "@/lib/wires-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireApiKeyUser(req, ["wires:read"]);
  if (user instanceof Response) return user;

  const { id } = await context.params;
  return Response.json({ shares: await listWireShareLinks(user, id) });
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const options = await readShareOptions(req);
  const user = await requireApiKeyUser(req, options.scope === "edit" || options.rotateToken ? ["wires:read", "wires:write"] : ["wires:read"]);
  if (user instanceof Response) return user;

  try {
    const { id } = await context.params;
    if (options.rotateToken) {
      const rotated = await rotateWireShareLink(user, options.rotateToken, { wireId: id });
      const viewToken = rotated.replacement.scope === "edit"
        ? rotated.replacement.viewToken ?? rotated.replacement.token
        : rotated.replacement.token;
      return Response.json({
        revoked: rotated.revoked,
        share: rotated.replacement,
        viewToken,
        editToken: rotated.replacement.scope === "edit" ? rotated.replacement.token : null,
        scope: rotated.replacement.scope,
        urls: shareUrls(req.nextUrl.origin, {
          viewToken,
          editToken: rotated.replacement.scope === "edit" ? rotated.replacement.token : null,
          wireId: rotated.replacement.wireId
        })
      });
    }
    const loaded = await loadUserWire(user, id);
    if (!loaded) return Response.json({ error: "Wire not found." }, { status: 404 });
    const links = await createWireShareLinks({
      user,
      wire: loaded.wire,
      scope: options.scope,
      pinRevision: options.pinRevision,
      expiresAt: options.expiresAt
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

export async function DELETE(req: NextRequest, context: RouteContext): Promise<Response> {
  const user = await requireApiKeyUser(req, ["wires:read", "wires:write"]);
  if (user instanceof Response) return user;

  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return Response.json({ error: "token is required." }, { status: 400 });

  try {
    const { id } = await context.params;
    const share = await revokeWireShareLink(user, token, { wireId: id });
    return Response.json({ share });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 404 }
    );
  }
}

async function readShareOptions(req: NextRequest): Promise<{
  scope: ShareScope;
  pinRevision: boolean;
  expiresAt: string | null;
  rotateToken: string | null;
}> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const payload = body && typeof body === "object"
    ? body as { scope?: unknown; pinRevision?: unknown; expiresAt?: unknown; expiresInSeconds?: unknown; rotateToken?: unknown }
    : {};
  return {
    scope: payload.scope === "edit" ? "edit" : "view",
    pinRevision: payload.pinRevision === true,
    expiresAt: resolveExpiresAt(payload),
    rotateToken: typeof payload.rotateToken === "string" && payload.rotateToken.trim() ? payload.rotateToken.trim() : null
  };
}

function resolveExpiresAt(payload: { expiresAt?: unknown; expiresInSeconds?: unknown }): string | null {
  if (typeof payload.expiresAt === "string" && payload.expiresAt.trim()) return payload.expiresAt.trim();
  if (typeof payload.expiresInSeconds === "number" && Number.isFinite(payload.expiresInSeconds) && payload.expiresInSeconds > 0) {
    const seconds = Math.min(365 * 24 * 60 * 60, Math.trunc(payload.expiresInSeconds));
    return new Date(Date.now() + seconds * 1000).toISOString();
  }
  return null;
}
