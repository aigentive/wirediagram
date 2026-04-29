import type { NextRequest } from "next/server";
import { persistSharedDiagram } from "@/lib/wire-canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Body must be JSON", { status: 400 });
  }

  let shared;
  try {
    shared = await persistSharedDiagram(body);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 422, headers: { "content-type": "application/json" } }
    );
  }

  const origin = req.nextUrl.origin;
  const url = shared.blobUrl ?? `${origin}/api/blob/wires/${shared.token}.json`;

  return new Response(
    JSON.stringify({
      token: shared.token,
      viewToken: shared.token,
      blobUrl: url,
      previewUrl: `${origin}/s/${shared.token}`,
      legacyPreviewUrl: `${origin}/preview/inline?d=${shared.token}`,
      urls: {
        view: `${origin}/s/${shared.token}`,
        edit: null,
        svg: `${origin}/s/${shared.token}.svg`,
        png: `${origin}/s/${shared.token}.png`,
        json: `${origin}/s/${shared.token}.json`,
        mermaid: `${origin}/s/${shared.token}.mmd`,
        workspace: null
      }
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
