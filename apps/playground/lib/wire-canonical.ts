import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { parseWireDiagram, type WireDiagram } from "@aigentive/wire-core";
import { writeLocalShare } from "@/lib/share-store";

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

  if (process.env.WIRE_SHARE_BACKEND !== "local" && process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`wires/${token}.json`, canonical, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    });
    return { diagram, canonical, token, blobUrl: blob.url };
  }

  await writeLocalShare(token, canonical);
  return { diagram, canonical, token, blobUrl: null };
}
