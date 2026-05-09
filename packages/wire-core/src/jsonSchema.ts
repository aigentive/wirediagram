import { zodToJsonSchema } from "zod-to-json-schema";
import { WireDiagramSchema } from "./schema.js";

/**
 * Emit a real JSON Schema (Draft 7 by default) for the canonical Wire
 * diagram. Used by the MCP server's `wire://schemas/wire-diagram` resource
 * so tools / agents can introspect the contract programmatically.
 */
export function wireDiagramJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(WireDiagramSchema, {
    name: "WireDiagram",
    $refStrategy: "root"
  }) as Record<string, unknown>;
}
