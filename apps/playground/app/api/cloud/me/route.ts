import { requireApiKeyUser } from "@/lib/api-keys-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await requireApiKeyUser(req, ["wires:read"]);
  if (user instanceof Response) return user;
  return Response.json({
    account: {
      email: user.email,
      key: user.key
    },
    apiKey: {
      id: user.apiKeyId,
      name: user.apiKeyName,
      scopes: user.apiKeyScopes
    }
  });
}
