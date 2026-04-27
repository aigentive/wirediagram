import { notFound } from "next/navigation";
import { parseWireDiagram } from "@aigentive/wire-core";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";
import { EditCanvas } from "../canvas";
import { readLocalShare } from "@/lib/share-store";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,16}$/;

async function resolveToken(token: string): Promise<unknown | null> {
  const local = await readLocalShare(token);
  if (local) return local;

  const base = process.env.BLOB_PUBLIC_BASE_URL;
  if (!base) return null;
  const res = await fetch(`${base}/wires/${token}.json`, { cache: "force-cache" });
  if (!res.ok) return null;
  return res.json();
}

export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { d } = await searchParams;

  let diagram;
  let label = id;
  if (id === "inline" && d) {
    let json: unknown = null;
    if (TOKEN_RE.test(d)) {
      json = await resolveToken(d);
    }
    if (!json) {
      try {
        json = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
      } catch {
        notFound();
      }
    }
    try {
      diagram = parseWireDiagram(json);
      label = diagram.title ?? "shared diagram";
    } catch {
      notFound();
    }
  } else if (TEMPLATES[id]) {
    diagram = parseWireDiagram(TEMPLATES[id]!);
    label = TEMPLATES[id]?.title ?? id;
  } else {
    notFound();
  }

  return <EditCanvas diagram={diagram} label={label} />;
}
