import type { NextRequest } from "next/server";
import { docsJson, publicDocsManifest } from "../../llm/_lib/responses";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const manifest = publicDocsManifest(req.nextUrl.origin);
  return docsJson({
    name: "Wire",
    product: "wire",
    version: manifest.version,
    llmDocs: manifest.absolute.llmDocs,
    agentGuide: manifest.absolute.agentGuide,
    mcp: `${req.nextUrl.origin}/mcp`,
    schema: manifest.absolute.schema,
    routes: manifest.routes
  });
}
