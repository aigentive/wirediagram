import { LLM_AGENT_GUIDE_MD } from "@aigentive/wire-mcp/dist/docs-shape.js";
import { docsText } from "../_lib/responses";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return docsText(LLM_AGENT_GUIDE_MD, "text/markdown");
}
