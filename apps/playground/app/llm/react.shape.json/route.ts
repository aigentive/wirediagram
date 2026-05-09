import { getLlmDocsTopic } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { docsJson } from "../_lib/responses";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return docsJson(getLlmDocsTopic("react"));
}
