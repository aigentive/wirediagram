import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Flow, useWireDiagram } from "./Flow.js";
import { ActionNode, AINode, TriggerNode } from "./nodes.js";

describe("Flow component", () => {
  it("renders compiled children as inline SVG and calls onCompile", () => {
    const onCompile = vi.fn();
    const markup = renderToStaticMarkup(
      <Flow id="flow" title="Flow" layout="LR" className="flow" style={{ height: 320 }} onCompile={onCompile}>
        <TriggerNode id="start" title="Start" />
        <AINode id="plan" title="Plan" from="start" model="gpt-4.1-mini" />
        <ActionNode id="ship" title="Ship" from="plan" />
      </Flow>
    );

    expect(onCompile).toHaveBeenCalledWith(expect.objectContaining({
      id: "flow",
      title: "Flow",
      nodes: expect.arrayContaining([expect.objectContaining({ id: "plan", model: "gpt-4.1-mini" })])
    }));
    expect(markup).toContain("class=\"flow\"");
    expect(markup).toContain("<svg");
    expect(markup).toContain("Start");
    expect(markup).toContain("Ship");
    expect(markup).toContain("height:320px");
  });

  it("supports json mode for compile-only usage", () => {
    const onCompile = vi.fn();
    const markup = renderToStaticMarkup(
      <Flow mode="json" onCompile={onCompile}>
        <TriggerNode id="start" title="Start" />
      </Flow>
    );

    expect(markup).toBe("");
    expect(onCompile).toHaveBeenCalledWith(expect.objectContaining({ nodes: [expect.objectContaining({ id: "start" })] }));
  });

  it("exposes useWireDiagram for JSX flow trees", () => {
    let compiledTitle = "";

    function Harness() {
      const diagram = useWireDiagram(
        <Flow title="Hook flow">
          <TriggerNode id="start" title="Start" />
        </Flow>
      );
      compiledTitle = diagram.title;
      return <span>{diagram.nodes.length}</span>;
    }

    const markup = renderToStaticMarkup(<Harness />);
    expect(markup).toContain("1");
    expect(compiledTitle).toBe("Hook flow");
  });
});
