import { notFound, redirect } from "next/navigation";
import { renderToSvg } from "@aigentive/wire-renderers";
import { parseWireDiagram } from "@aigentive/wire-core";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";
import { PreviewCanvas } from "../canvas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,96}$/;

export default async function PreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { d } = await searchParams;

  let diagram;
  let label = id;
  let editHref: string | undefined;
  if (id === "inline" && d) {
    if (TOKEN_RE.test(d)) {
      redirect(`/s/${encodeURIComponent(d)}`);
    }
    let json: unknown = null;
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
      editHref = `/edit/inline?d=${d}`;
    } catch {
      notFound();
    }
  } else if (TEMPLATES[id]) {
    diagram = parseWireDiagram(TEMPLATES[id]!);
    label = TEMPLATES[id]?.title ?? id;
    editHref = `/edit/${id}`;
  } else {
    notFound();
  }
  const svg = renderToSvg(diagram);

  return <PreviewCanvas svg={svg} label={label} editHref={editHref} />;
}
