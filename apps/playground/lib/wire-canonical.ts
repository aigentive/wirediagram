import { createHash } from "node:crypto";
import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
import { writeCloudText } from "@/lib/cloud-kv-store";

export function stableStringify(value: unknown): string {
  return stableJson(value) ?? "null";
}

function stableJson(value: unknown): string | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((item) => stableJson(item) ?? "null").join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys
    .map((key) => {
      const serialized = stableJson(obj[key]);
      return serialized === undefined ? null : `${JSON.stringify(key)}:${serialized}`;
    })
    .filter((entry): entry is string => entry !== null);
  return "{" + entries.join(",") + "}";
}

export function tokenFor(canonical: string): string {
  return createHash("sha256").update(canonical).digest("base64url").slice(0, 12);
}

export async function persistSharedDiagram(input: unknown): Promise<{
  diagram: WireDiagram;
  canonical: string;
  token: string;
  blobUrl: string | null;
}> {
  const diagram = parseWireDiagram(input);
  const canonical = stableStringify(diagram);
  const token = tokenFor(canonical);

  await writeCloudText(`wires/${token}.json`, canonical);
  return { diagram, canonical, token, blobUrl: null };
}
