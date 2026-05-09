import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyDiagram } from "@aigentive/wire-core";
import { WirePalette } from "./components/WirePalette.js";
import { WireOptionPanel } from "./components/WireOptionPanel.js";
import { WireNodeCardView, cardStyleForNode, wireCardContentForNode } from "./components/WireNodeCardView.js";
import { WireNodeList } from "./components/WireNodeList.js";
import { WireToolbar } from "./components/WireToolbar.js";
import { WireValidationPanel } from "./components/WireValidationPanel.js";
import { WireProvider } from "./provider/WireProvider.js";
import type { WireNodeRenderContext } from "./canvas/nodeTypes.js";

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
    expect(markup).toContain("rounded-md");
    expect(markup).toContain("bg-wire-kind-trigger-bg");
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
    expect(markup).toContain("Validation");
    expect(markup).toContain("text-wire-status-valid");
  });

  it("renders declarative node options without graph-canvas app code", () => {
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

  it("renders serializable custom card content from node data", () => {
    const node = {
      id: "qa-reviewed",
      kind: "human" as const,
      title: "Switch default to reviewed mode and make QA fail-closed",
      data: {
        card: {
          description: "Change default reviewMode from fast to reviewed in config.",
          badges: [{ label: "Regular" }],
          progress: { value: 1, max: 1, steps: 8, showPercent: true }
        }
      }
    };

    const markup = renderToStaticMarkup(
      <WireNodeCardView {...renderContextFor(node)} />
    );

    expect(wireCardContentForNode(node)?.badges?.length).toBe(1);
    expect(markup).toContain("Switch default to reviewed mode");
    expect(markup).toContain("Regular");
    expect(markup).toContain("100%");
    expect(markup).toContain("width:100%");
  });

  it("renders canonical node style overrides on card shells", () => {
    const node = {
      id: "styled",
      kind: "action" as const,
      title: "Styled card",
      tone: "warning" as const,
      style: {
        fill: "#111827",
        stroke: "#38bdf8",
        strokeWidth: 2,
        borderRadius: 6,
        textColor: "#f8fafc",
        shadow: false
      }
    };

    const style = cardStyleForNode(node);
    expect(style).toMatchObject({
      backgroundColor: "#111827",
      backgroundImage: "none",
      borderColor: "#38bdf8",
      borderWidth: 2,
      borderRadius: 6
    });
    expect((style as Record<string, unknown>)["--wire-fg-primary"]).toBe("#f8fafc");
    expect((style as Record<string, unknown>)["--wire-card-shadow"]).toBe("none");

    const markup = renderToStaticMarkup(
      <WireNodeCardView {...renderContextFor(node)} />
    );

    expect(markup).toContain("background-color:#111827");
    expect(markup).toContain("border-color:#38bdf8");
    expect(markup).toContain("--wire-fg-primary:#f8fafc");
  });

  it("allows React-only card body slots while keeping the default card shell", () => {
    const node = {
      id: "custom",
      kind: "ai" as const,
      title: "Custom body",
      model: "gpt-4.1"
    };

    const markup = renderToStaticMarkup(
      <WireNodeCardView
        {...renderContextFor(node)}
        content={<div data-testid="card-body">Runtime content slot</div>}
        footer="Runtime footer"
      />
    );

    expect(markup).toContain("Runtime content slot");
    expect(markup).toContain("Runtime footer");
    expect(markup).toContain("rounded-lg");
  });
});

function renderContextFor(node: WireNodeRenderContext["node"]): WireNodeRenderContext {
  return {
    node,
    data: {
      title: node.title,
      description: node.description,
      kind: node.kind,
      wire: node
    },
    kind: node.kind,
    tone: node.tone ?? "default",
    theme: {
      border: "#cbd5e1",
      background: "#ffffff",
      accent: "#475569"
    },
    selected: false,
    width: 240,
    height: 160,
    options: {},
    optionSpecs: []
  };
}
