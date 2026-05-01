import { notFound } from "next/navigation";
import { parseWireDiagram } from "@aigentive/wire-core";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";
import { resolvePublicShare } from "@/lib/share-links-store";
import { EditCanvas } from "../canvas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,96}$/;

export default async function EditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { d } = await searchParams;

  let diagram;
  let label = id;
  let shareToken: string | undefined;
  let initialPreviewHref: string | null = null;
  let importHref: string | null = null;
  if (id === "inline" && d) {
    if (TOKEN_RE.test(d)) {
      const share = await resolvePublicShare(d, "view");
      if (!share) notFound();
      diagram = share.diagram;
      label = share.diagram.title ?? "shared diagram";
      const viewToken = share.record?.viewToken ?? share.record?.token ?? share.legacyToken ?? d;
      shareToken = share.record?.scope === "edit" ? share.record.token : undefined;
      initialPreviewHref = `/s/${encodeURIComponent(viewToken)}`;
      importHref = `/wires/import?from=${encodeURIComponent(viewToken)}`;
    } else {
      let json: unknown = null;
      try {
        json = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
      } catch {
        notFound();
      }
      try {
        diagram = parseWireDiagram(json);
        label = diagram.title ?? "shared diagram";
      } catch {
        notFound();
      }
    }
  } else if (TEMPLATES[id]) {
    diagram = parseWireDiagram(TEMPLATES[id]!);
    label = TEMPLATES[id]?.title ?? id;
  } else {
    notFound();
  }

  return (
    <EditCanvas
      diagram={JSON.parse(JSON.stringify(diagram))}
      label={label}
      shareToken={shareToken}
      initialPreviewHref={initialPreviewHref}
      importHref={importHref}
    />
  );
}
