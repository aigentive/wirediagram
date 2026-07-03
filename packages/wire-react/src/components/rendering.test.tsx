import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyDiagram, validate, type ApplyWireActionResult, type ValidationResult, type WireAction, type WireDiagram } from "@aigentive/wire-core";
import { WireCanvas } from "../canvas/WireCanvas.js";
import type { WireNodeRenderContext } from "../canvas/nodeTypes.js";
import { WireContext, DEFAULT_VIEWPORT, EMPTY_SELECTION, type WireContextValue } from "../provider/context.js";
import { WireProvider } from "../provider/WireProvider.js";
import type { WireSelection } from "../provider/types.js";
import { WireEditor } from "./WireEditor.js";
import { WireInspector } from "./WireInspector.js";
import { WireNodeCardView } from "./WireNodeCardView.js";
import { WireOptionPanel } from "./WireOptionPanel.js";
import { WireValidationPanel } from "./WireValidationPanel.js";
import { WireViewer } from "./WireViewer.js";
import { WireWorkspace } from "./WireWorkspace.js";

describe("wire component rendering surfaces", () => {
  it("server-renders viewer and editor canvases with controls, minimap, handles, labels, and markers", () => {
    const diagram = sampleDiagram();
    const viewer = renderToStaticMarkup(
      <WireViewer diagram={diagram} fitView={false} showMiniMap edgeRouting="smoothstep" />
    );
    const editor = renderToStaticMarkup(
      <WireEditor diagram={diagram} fitView={false} showMiniMap showControls edgeStyle={{ markerStart: "circle", markerEnd: "diamond" }} />
    );

    expect(viewer).toContain("data-wire-canvas=\"true\"");
    expect(viewer).toContain("wire-canvas wire-canvas--styled");
    expect(viewer).toContain("Canvas minimap");
    expect(viewer).toContain("queued");
    expect(viewer).toContain("wire-canvas-arrow-end");
    expect(editor).toContain("Zoom in");
    expect(editor).toContain("wire-controls wire-controls--styled");
    expect(editor).toContain("Fit view");
    expect(editor).toContain("data-wire-handle=\"true\"");
    expect(editor).toContain("wire-canvas-circle-start");
  });

  it("server-renders canvas accessibility labels and live status region", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={sampleDiagram()}>
        <WireCanvas
          fitView={false}
          showMiniMap
          showControls
          ariaLabelConfig={{
            canvas: "Workflow diagram",
            node: (node) => `Node ${node.title}`,
            edge: (edge) => `Edge ${edge.id}`,
            minimap: "Workflow map",
            controls: { zoomIn: "Increase zoom", zoomOut: "Decrease zoom", fitView: "Fit workflow" }
          }}
        />
      </WireProvider>
    );

    expect(markup).toContain("role=\"region\"");
    expect(markup).toContain("aria-label=\"Workflow diagram\"");
    expect(markup).toContain("aria-label=\"Node Write Code\"");
    expect(markup).toContain("aria-label=\"Edge code-review\"");
    expect(markup).toContain("aria-label=\"Workflow map\"");
    expect(markup).toContain("aria-label=\"Increase zoom\"");
    expect(markup).toContain("role=\"status\"");
  });


  it("server-renders workspace sidebars and custom inspector slots", () => {
    const markup = renderToStaticMarkup(
      <WireWorkspace
        diagram={sampleDiagram()}
        title="Workflow"
        subtitle="Production"
        layout="embedded"
        optionCatalog={{ action: [{ key: "owner", label: "Owner", type: "text" }] }}
        defaultInspectNodeId="code"
        sidebar={<div>Custom nav</div>}
        inspector={<div>Custom inspector</div>}
        canvasProps={{ fitView: false, showMiniMap: false }}
      />
    );

    expect(markup).toContain("Workflow");
    expect(markup).toContain("Production");
    expect(markup).toContain("wire-workspace wire-workspace--styled");
    expect(markup).toContain("wire-workspace__canvas-region");
    expect(markup).toContain("Custom nav");
    expect(markup).toContain("Custom inspector");
    expect(markup).toContain("data-wire-canvas=\"true\"");
  });

  it("server-renders workspace default and hidden-sidebar branches", () => {
    const defaultMarkup = renderToStaticMarkup(
      <WireWorkspace
        diagram={sampleDiagram()}
        optionCatalog={{ action: [{ key: "owner", label: "Owner", type: "text" }] }}
        defaultInspectNodeId="code"
        canvasProps={{ fitView: false, showMiniMap: false, showControls: false }}
      />
    );
    expect(defaultMarkup).toContain("Wire");
    expect(defaultMarkup).toContain("Incoming Request");
    expect(defaultMarkup).toContain("Owner");
    expect(defaultMarkup).toContain("Validation");

    const minimalMarkup = renderToStaticMarkup(
      <WireWorkspace
        diagram={sampleDiagram()}
        showNodeList={false}
        showOptions={false}
        showValidation={false}
        canvasProps={{ fitView: false, showMiniMap: false, showControls: false }}
      />
    );
    expect(minimalMarkup).toContain("Wire");
    expect(minimalMarkup).toContain("data-wire-canvas=\"true\"");
    expect(minimalMarkup).not.toContain("Owner");
    expect(minimalMarkup).not.toContain("Validation");

    const edgeMarkup = renderToStaticMarkup(
      <WireWorkspace
        diagram={sampleDiagram()}
        defaultInspectEdgeId="code-review"
        canvasProps={{ fitView: false, showMiniMap: false, showControls: false }}
      />
    );
    expect(edgeMarkup).toContain("Edge");
    expect(edgeMarkup).toContain("Label");
    expect(edgeMarkup).toContain("code");
    expect(edgeMarkup).toContain("review");
  });

  it("renders inspector empty, preset, and custom appearance states", () => {
    const emptyMarkup = renderToStaticMarkup(
      <WireContext.Provider value={contextFor(sampleDiagram())}>
        <WireInspector />
      </WireContext.Provider>
    );
    expect(emptyMarkup).toContain("No node selected");
    expect(emptyMarkup).toContain("wire-inspector wire-inspector--styled");

    const diagram = sampleDiagram();
    const selectedMarkup = renderToStaticMarkup(
      <WireContext.Provider value={contextFor(diagram, { nodeIds: ["code"], edgeIds: [] })}>
        <WireInspector className="inspector" />
      </WireContext.Provider>
    );
    expect(selectedMarkup).toContain("Write Code");
    expect(selectedMarkup).toContain("value=\"warning\"");
    expect(selectedMarkup).toContain("value=\"#fffbeb\"");
    expect(selectedMarkup).toContain("value=\"#fbbf24\"");
    expect(selectedMarkup).toContain("value=\"#78350f\"");
    expect(selectedMarkup).toContain("Valid");

    const customDiagram: WireDiagram = {
      ...diagram,
      nodes: diagram.nodes.map((node) =>
        node.id === "code"
          ? { ...node, style: { fill: "#111827", stroke: "#38bdf8", textColor: "#f8fafc", borderRadius: 0, shadow: false } }
          : node
      )
    };
    const customMarkup = renderToStaticMarkup(
      <WireContext.Provider value={contextFor(customDiagram, { nodeIds: ["code"], edgeIds: [] })}>
        <WireInspector />
      </WireContext.Provider>
    );
    expect(customMarkup).toContain("value=\"custom\"");
    expect(customMarkup).toContain("value=\"#111827\"");
    expect(customMarkup).toContain("value=\"0\"");
    expect(customMarkup).toContain("Clear");
  });

  it("renders option fields for each input type and hides status when the selected node has issues", () => {
    const diagram: WireDiagram = {
      ...emptyDiagram({ id: "options", title: "Options" }),
      nodes: [
        {
          id: "bad",
          kind: "action",
          title: "Needs options",
          data: {
            options: {
              owner: "Ada",
              notes: "Review carefully",
              retries: 2,
              enabled: true,
              mode: "fast"
            }
          }
        }
      ],
      edges: [{ id: "missing", from: "bad", to: "missing-node" }]
    };

    const markup = renderToStaticMarkup(
      <WireContext.Provider
        value={contextFor(diagram, { nodeIds: ["bad"], edgeIds: [] }, {
          valid: false,
          issues: [{ severity: "error", code: "node.bad", message: "Bad node", nodeId: "bad" }]
        })}
      >
        <WireOptionPanel
          catalog={{
            action: [
              { key: "owner" },
              { key: "notes", type: "textarea", description: "Long form notes" },
              { key: "retries", type: "number", min: 0, max: 5, step: 1 },
              { key: "enabled", type: "boolean" },
              { key: "mode", type: "select", options: ["fast", { label: "Careful", value: "careful" }] }
            ]
          }}
        />
      </WireContext.Provider>
    );

    expect(markup).toContain("Owner");
    expect(markup).toContain("wire-option-panel wire-option-panel--styled");
    expect(markup).toContain("wire-option-field");
    expect(markup).toContain("Review carefully");
    expect(markup).toContain("value=\"2\"");
    expect(markup).toContain("checked=\"\"");
    expect(markup).toContain("Careful");
    expect(markup).toContain("Long form notes");
    expect(markup).not.toContain("text-wire-status-valid");
  });

  it("renders validation warnings and invalid issues", () => {
    const diagram: WireDiagram = {
      ...emptyDiagram({ id: "invalid", title: "Invalid" }),
      nodes: [{ id: "start", kind: "trigger", title: "Start" }],
      edges: [{ id: "bad", from: "start", to: "missing" }]
    };
    const markup = renderToStaticMarkup(
      <WireContext.Provider value={contextFor(diagram)}>
        <WireValidationPanel />
      </WireContext.Provider>
    );

    expect(markup).toContain("Invalid");
    expect(markup).toContain("text-wire-status-invalid");
    expect(markup).toContain("edge.to-missing");
  });

  it("renders a raw canvas with custom renderers and disabled chrome", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={sampleDiagram()}>
        <WireCanvas
          fitView={false}
          showBackground={false}
          showControls={false}
          showMiniMap={false}
          renderNodeCard={(ctx) => <div data-custom-card>{ctx.node.title}</div>}
          renderEdge={(ctx) => <path data-custom-edge d={ctx.path} stroke={ctx.style.stroke} />}
        />
      </WireProvider>
    );

    expect(markup).toContain("data-custom-card=\"true\"");
    expect(markup).toContain("data-custom-edge=\"true\"");
    expect(markup).not.toContain("Zoom in");
    expect(markup).not.toContain("Canvas minimap");
  });

  it("renders structured card content branches", () => {
    const node = {
      id: "card",
      kind: "action" as const,
      title: "Canonical title",
      data: {
        card: {
          title: "Display title",
          description: "Display description",
          badges: ["plain", { label: "risk", tone: "error" as const }],
          meta: ["owner: ada", 3, true, { label: "env", value: "prod" }],
          progress: { value: 2, max: 4, label: "Progress", steps: 4, showPercent: true },
          footer: "Footer text"
        }
      }
    };

    const markup = renderToStaticMarkup(<WireNodeCardView {...renderContextFor(node)} />);

    expect(markup).toContain("Display title");
    expect(markup).toContain("Display description");
    expect(markup).toContain("plain");
    expect(markup).toContain("risk");
    expect(markup).toContain("owner: ada");
    expect(markup).toContain("env: prod");
    expect(markup).toContain("50%");
    expect(markup).toContain("Footer text");
  });
});

function sampleDiagram(): WireDiagram {
  return {
    version: 1,
    id: "sample",
    title: "Sample",
    layout: "LR",
    nodes: [
      { id: "start", kind: "trigger", title: "Incoming Request", position: { x: 0, y: 60 } },
      {
        id: "code",
        kind: "action",
        title: "Write Code",
        description: "Small commits",
        from: "start",
        tone: "warning",
        position: { x: 310, y: 40 },
        data: { options: { owner: "Ada" } }
      },
      { id: "review", kind: "human", title: "Review", from: "code", position: { x: 650, y: 60 } }
    ],
    edges: [
      {
        id: "start-code",
        from: "start",
        to: "code",
        label: "queued",
        style: { stroke: "#475569", markerStart: "circle" }
      },
      { id: "code-review", from: "code", to: "review", routing: "step" }
    ]
  };
}

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

function contextFor(
  diagram: WireDiagram,
  selection: WireSelection = EMPTY_SELECTION,
  validationOverride?: ValidationResult
): WireContextValue {
  const validation: ValidationResult = validationOverride ?? validate(diagram);
  const noopResult: ApplyWireActionResult = {
    diagram,
    validation,
    changedNodeIds: [],
    changedEdgeIds: []
  };
  return {
    diagram,
    validation,
    selection,
    viewport: DEFAULT_VIEWPORT,
    mode: "edit",
    history: { undoStack: [], redoStack: [] },
    dirty: false,
    actions: {
      dispatch: (_action: WireAction) => noopResult,
      dispatchMany: (_actions: WireAction[]) => noopResult,
      validate: () => validation
    },
    selectionActions: {
      setSelection: () => undefined,
      clearSelection: () => undefined
    },
    viewportActions: {
      setViewport: () => undefined
    },
    eventActions: {
      emit: () => undefined
    },
    historyActions: {
      canUndo: false,
      canRedo: false,
      undo: () => undefined,
      redo: () => undefined
    },
    setMode: () => undefined,
    markClean: () => undefined
  };
}
