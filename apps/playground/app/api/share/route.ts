import { put } from "@vercel/blob";
import { parseWireDiagram } from "@aigentive/wire-core";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { writeLocalShare } from "@/lib/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

function tokenFor(canonical: string): string {
  return createHash("sha256").update(canonical).digest("base64url").slice(0, 12);
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Body must be JSON", { status: 400 });
  }

  let diagram;
  try {
    diagram = parseWireDiagram(body);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 422, headers: { "content-type": "application/json" } }
    );
  }

  const canonical = stableStringify(diagram);
  const token = tokenFor(canonical);

  const origin = req.nextUrl.origin;
  let url = `${origin}/api/blob/wires/${token}.json`;

  if (process.env.WIRE_SHARE_BACKEND !== "local" && process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`wires/${token}.json`, canonical, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json"
    });
    url = blob.url;
  } else {
    await writeLocalShare(token, canonical);
  }

  return new Response(
    JSON.stringify({
      token,
      blobUrl: url,
      previewUrl: `${origin}/preview/inline?d=${token}`
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
