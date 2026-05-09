import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "./CodeBlock.js";
import { DotGrid } from "./DotGrid.js";
import { Edge } from "./Edge.js";
import { GroupFrame } from "./GroupFrame.js";
import { InlineCode } from "./InlineCode.js";
import { KindChip } from "./KindChip.js";
import { NodeCard } from "./NodeCard.js";
import { Ref } from "./Ref.js";
import { StatusPill } from "./StatusPill.js";

describe("wire primitives", () => {
  it("renders code, inline code, refs, and dot-grid containers", () => {
    const markup = renderToStaticMarkup(
      <DotGrid className="outer" style={{ backgroundPosition: "4px 4px" }}>
        <CodeBlock language="ts" className="code">const ok = true;</CodeBlock>
        <InlineCode className="inline">wire.id</InlineCode>
        <Ref className="ref">node-1</Ref>
      </DotGrid>
    );

    expect(markup).toContain("data-language=\"ts\"");
    expect(markup).toContain("const ok = true;");
    expect(markup).toContain("wire.id");
    expect(markup).toContain("node-1");
    expect(markup).toContain("background-position:4px 4px");
  });

  it("renders solid and dashed edge primitives", () => {
    const solid = renderToStaticMarkup(<Edge width={44} className="solid" />);
    const dashed = renderToStaticMarkup(<Edge width={32} dashed className="dash" />);

    expect(solid).toContain("width:44px");
    expect(solid).toContain("background-color:var(--wire-slate-400)");
    expect(dashed).toContain("width:32px");
    expect(dashed).toContain("linear-gradient");
  });

  it("renders group frames with optional counters and selected state", () => {
    const markup = renderToStaticMarkup(
      <GroupFrame title="Ops" count={3} selected className="group-frame">
        <span>Nested</span>
      </GroupFrame>
    );

    expect(markup).toContain("data-selected=\"true\"");
    expect(markup).toContain("Ops");
    expect(markup).toContain("3");
    expect(markup).toContain("Nested");
    expect(markup).toContain("border-wire-focus");

    const plain = renderToStaticMarkup(<GroupFrame title="Plain" />);
    expect(plain).toContain("Plain");
    expect(plain).toContain("border-wire-strong");
    expect(plain).not.toContain("data-selected");
  });

  it("renders kind chips and status pills for every public variant", () => {
    const markup = renderToStaticMarkup(
      <div>
        {(["trigger", "action", "ai", "tool", "condition", "human", "memory", "retrieval", "guardrail", "end", "note", "group"] as const).map((kind) => (
          <KindChip key={kind} kind={kind} />
        ))}
        {(["valid", "reserved", "warn", "invalid"] as const).map((kind) => (
          <StatusPill key={kind} kind={kind}>{kind}</StatusPill>
        ))}
      </div>
    );

    expect(markup).toContain("TRIGGER");
    expect(markup).toContain("GUARD");
    expect(markup).toContain("GROUP");
    expect(markup).toContain("text-wire-status-invalid");
  });

  it("renders node cards with and without auxiliary content", () => {
    const full = renderToStaticMarkup(
      <NodeCard
        kind="action"
        title="Write code"
        refLabel="code"
        meta="gpt-4.1"
        selected
        footer="Done"
        className="card"
      >
        <span>Body</span>
      </NodeCard>
    );
    const titleOnly = renderToStaticMarkup(
      <NodeCard kind="end" title="Ship" showKindChip={false} />
    );

    expect(full).toContain("ACTION");
    expect(full).toContain("code");
    expect(full).toContain("gpt-4.1");
    expect(full).toContain("Body");
    expect(full).toContain("Done");
    expect(full).toContain("border-wire-focus");
    expect(full).toContain("min-width:220px");

    expect(titleOnly).toContain("Ship");
    expect(titleOnly).not.toContain("END");
    expect(titleOnly).toContain("justify-center");
  });
});
