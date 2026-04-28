import { notFound } from "next/navigation";
import { parseWireDiagram } from "@aigentive/wire-core";
import { TEMPLATES } from "@aigentive/wire-mcp/dist/templates.js";
import { EditCanvas } from "../../canvas";

export const dynamic = "force-static";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function TemplateEdit({ params }: Props) {
  const { name } = await params;
  const tpl = TEMPLATES[name];
  if (!tpl) notFound();
  const diagram = parseWireDiagram(tpl);
  return <EditCanvas diagram={JSON.parse(JSON.stringify(diagram))} label={tpl.title ?? name} />;
}
