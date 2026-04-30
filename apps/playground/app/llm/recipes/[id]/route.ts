import { getLlmDocsRecipe, listLlmDocsRecipes } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { docsJson, docsNotFound } from "../../_lib/responses";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const recipe = getLlmDocsRecipe(id);
  if (!recipe) {
    return docsNotFound(`Recipe "${id}" not found. Known recipes: ${listLlmDocsRecipes().join(", ")}.`);
  }
  return docsJson(recipe);
}
