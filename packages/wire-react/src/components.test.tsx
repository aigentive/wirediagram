import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyDiagram } from "@aigentive/wire-core";
import { WirePalette } from "./components/WirePalette.js";
import { WireOptionPanel } from "./components/WireOptionPanel.js";
import { WireNodeList } from "./components/WireNodeList.js";
import { WireToolbar } from "./components/WireToolbar.js";
import { WireValidationPanel } from "./components/WireValidationPanel.js";
import { WireProvider } from "./provider/WireProvider.js";

describe("shared editor components", () => {
  it("renders the complete default node palette with library styling", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WirePalette />
      </WireProvider>
    );

    expect(markup).toContain("Add node");
    expect(markup).toContain("Retrieval");
    expect(markup).toContain("Memory");
    expect(markup).toContain("Guardrail");
    expect(markup).toContain("Group");
    expect(markup).toContain("border-radius:8px");
  });

  it("renders toolbar controls without browser-default button styling", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WireToolbar />
      </WireProvider>
    );

    expect(markup).toContain("aria-label=\"Undo\"");
    expect(markup).toContain("cursor:not-allowed");
    expect(markup).toContain("View");
  });

  it("renders validation status as a styled panel", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WireValidationPanel />
      </WireProvider>
    );

    expect(markup).toContain("Valid");
    expect(markup).toContain("text-emerald-700");
    expect(markup).toContain("rounded-lg");
  });

  it("renders declarative node options without React Flow app code", () => {
    const diagram = {
      ...emptyDiagram(),
      nodes: [
        {
          id: "plan",
          kind: "ai" as const,
          title: "Plan",
          model: "gpt-4.1",
          data: { options: { temperature: 0.2 } }
        }
      ]
    };

    const markup = renderToStaticMarkup(
      <WireProvider diagram={diagram}>
        <WireOptionPanel
          nodeId="plan"
          catalog={{
            ai: [
              { key: "model", label: "Model", storage: "node", type: "select", options: ["gpt-4.1", "gpt-4.1-mini"] },
              { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1 }
            ]
          }}
        />
      </WireProvider>
    );

    expect(markup).toContain("Model");
    expect(markup).toContain("gpt-4.1-mini");
    expect(markup).toContain("Temperature");
    expect(markup).toContain("value=\"0.2\"");
  });

  it("renders a reusable node list that can drive selection and inspection", () => {
    const diagram = {
      ...emptyDiagram(),
      nodes: [
        { id: "start", kind: "trigger" as const, title: "Start" },
        { id: "stage", kind: "group" as const, title: "Stage" }
      ]
    };

    const markup = renderToStaticMarkup(
      <WireProvider diagram={diagram}>
        <WireNodeList />
      </WireProvider>
    );

    expect(markup).toContain("Start");
    expect(markup).not.toContain("Stage");
    expect(markup).toContain("rounded-lg");
  });
});
