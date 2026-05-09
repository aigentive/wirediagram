import { type WireDiagram, splitFromRef } from "./schema.js";
import { normalize } from "./normalize.js";

// BMP codepoints with broad font coverage; avoids emoji + obscure dingbats
// so headless rasterizers (resvg / wkhtmltopdf / etc.) don't render tofu.
const KIND_PREFIX: Record<string, string> = {
  trigger: "▶",
  ai: "✦",
  tool: "✱",
  action: "→",
  condition: "?",
  human: "◉",
  memory: "⊙",
  retrieval: "⊕",
  guardrail: "◆",
  end: "■"
};

function escapeLabel(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function nodeLabel(node: { kind: string; title: string }): string {
  const prefix = KIND_PREFIX[node.kind] ?? "";
  return prefix ? `${prefix} ${node.title}` : node.title;
}

function nodeShape(node: { kind: string; title: string }): string {
  switch (node.kind) {
    case "trigger":
      return `(["${escapeLabel(nodeLabel(node))}"])`;
    case "condition":
      return `{"${escapeLabel(nodeLabel(node))}"}`;
    case "ai":
      return `[["${escapeLabel(nodeLabel(node))}"]]`;
    case "tool":
      return `[/"${escapeLabel(nodeLabel(node))}"/]`;
    case "human":
      return `[\\"${escapeLabel(nodeLabel(node))}"\\]`;
    case "end":
      return `(("${escapeLabel(nodeLabel(node))}"))`;
    case "note":
      return `["${escapeLabel(nodeLabel(node))}"]`;
    case "group":
      return `["${escapeLabel(nodeLabel(node))}"]`;
    default:
      return `["${escapeLabel(nodeLabel(node))}"]`;
  }
}

/**
 * Convert a Wire diagram to a Mermaid `flowchart` string. Useful for quick
 * agent-side previews and round-trips when tools only accept Mermaid input.
 */
export function toMermaid(diagram: WireDiagram): string {
  const { resolvedEdges, nodeIndex } = normalize(diagram);
  const direction = diagram.layout ?? "LR";
  const lines: string[] = [`flowchart ${direction}`];

  for (const node of diagram.nodes) {
    if (node.kind === "note") continue;
    lines.push(`  ${node.id}${nodeShape(node)}`);
  }

  for (const edge of resolvedEdges) {
    const source = nodeIndex.get(edge.from);
    if (!source) continue;
    const label = edge.label ?? edge.branch ?? edge.fromBranch;
    const arrow = label ? `-- "${escapeLabel(label)}" -->` : "-->";
    lines.push(`  ${edge.from} ${arrow} ${edge.to}`);
  }

  // Notes as labelled comments — Mermaid 'note' syntax is sequence-only,
  // so we render them as a separate subgraph for readability.
  const notes = diagram.nodes.filter((n) => n.kind === "note");
  if (notes.length) {
    lines.push("  subgraph notes [Notes]");
    for (const note of notes) {
      lines.push(`    ${note.id}["📝 ${escapeLabel(note.title)}"]`);
      if (note.attachedTo) {
        lines.push(`    ${note.id} -.- ${note.attachedTo}`);
      }
    }
    lines.push("  end");
  }

  return lines.join("\n");
}

export { splitFromRef };
