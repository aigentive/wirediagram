import { notFound } from "next/navigation";
import { renderToSvg } from "@aigentive/wire-renderers";
import { parseWireDiagram } from "@aigentive/wire-core";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";
import { PreviewCanvas } from "../../canvas";

export const dynamic = "force-static";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function TemplatePreview({ params }: Props) {
  const { name } = await params;
  const tpl = TEMPLATES[name];
  if (!tpl) notFound();
  const diagram = parseWireDiagram(tpl);
  const svg = renderToSvg(diagram);
  return <PreviewCanvas svg={svg} label={tpl.title ?? name} editHref={`/edit/${name}`} />;
}
