import { readLocalShare } from "@/lib/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: Props): Promise<Response> {
  const { token: rawToken } = await params;
  const token = rawToken.endsWith(".json") ? rawToken.slice(0, -5) : rawToken;
  const diagram = await readLocalShare(token);
  if (!diagram) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(diagram), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}
