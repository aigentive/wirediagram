import { wireDiagramJsonSchema } from "@aigentive/wire-core";
import { docsSchemaJson } from "../../_lib/responses";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return docsSchemaJson({
    $schema: "https://json-schema.org/draft-07/schema",
    $id: "https://aigentive.dev/schemas/wire-diagram.json",
    ...wireDiagramJsonSchema()
  });
}
