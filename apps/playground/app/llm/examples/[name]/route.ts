import { getLlmDocsExample, listLlmDocsExamples } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { docsJson, docsNotFound } from "../../_lib/responses";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const { name } = await context.params;
  const example = getLlmDocsExample(name);
  if (!example) {
    return docsNotFound(`Example "${name}" not found. Known examples: ${listLlmDocsExamples().join(", ")}.`);
  }
  return docsJson(example);
}
