import { requireCurrentUser } from "@/lib/current-user";
import { ApiKeyNotFoundError, revokeUserApiKey } from "@/lib/api-keys-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: RouteContext): Promise<Response> {
  const user = await requireCurrentUser();
  if (user instanceof Response) return user;

  try {
    const { id } = await context.params;
    await revokeUserApiKey(user, id);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ApiKeyNotFoundError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
