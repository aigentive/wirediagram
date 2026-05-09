import { parseWireDiagram } from "@aigentive/wire-core";
import { renderToSvg } from "@aigentive/wire-renderers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Body must be JSON", { status: 400 });
  }
  try {
    const diagram = parseWireDiagram(body);
    const svg = renderToSvg(diagram);
    return new Response(svg, {
      status: 200,
      headers: { "content-type": "image/svg+xml; charset=utf-8" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 422, headers: { "content-type": "application/json" } }
    );
  }
}
