import type { NextRequest } from "next/server";
import { getLlmDocsShape } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { docsJson, publicDocsManifest } from "../_lib/responses";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const manifest = publicDocsManifest(req.nextUrl.origin);
  const index = getLlmDocsShape();
  return docsJson({
    ...manifest,
    topics: index.topics.map((topic) => topic.id),
    examples: index.examples,
    recipes: index.recipes
  });
}
