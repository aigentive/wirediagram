import { createHash } from "node:crypto";
import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
import { writeCloudText } from "@/lib/cloud-kv-store";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((key) => JSON.stringify(key) + ":" + stableStringify(obj[key])).join(",") + "}";
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
