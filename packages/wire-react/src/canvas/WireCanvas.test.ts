import { describe, expect, it } from "vitest";
import { resolveWireCanvasInteraction } from "./WireCanvas.js";

describe("resolveWireCanvasInteraction", () => {
  it("keeps edit mode selectable by default", () => {
    expect(resolveWireCanvasInteraction({ mode: "edit" })).toEqual({
      editable: true,
      selectOnNodeClick: true,
      selectOnEdgeClick: true,
      clearSelectionOnPaneClick: true,
      elementsSelectable: true
    });
  });

  it("keeps view mode observable but non-selecting by default", () => {
    expect(resolveWireCanvasInteraction({ mode: "view" })).toEqual({
      editable: false,
      selectOnNodeClick: false,
      selectOnEdgeClick: false,
      clearSelectionOnPaneClick: false,
      elementsSelectable: false
    });
  });

  it("lets view mode opt into selection behaviors", () => {
    expect(
      resolveWireCanvasInteraction({
        mode: "view",
        selectOnNodeClick: true,
        selectOnEdgeClick: true,
        clearSelectionOnPaneClick: true
      })
    ).toEqual({
      editable: false,
      selectOnNodeClick: true,
      selectOnEdgeClick: true,
      clearSelectionOnPaneClick: true,
      elementsSelectable: true
    });
  });

  it("keeps edit mode selectable even when click selection is disabled", () => {
    expect(
      resolveWireCanvasInteraction({
        mode: "edit",
        selectOnNodeClick: false,
        selectOnEdgeClick: false,
        clearSelectionOnPaneClick: false
      })
    ).toEqual({
      editable: true,
      selectOnNodeClick: false,
      selectOnEdgeClick: false,
      clearSelectionOnPaneClick: false,
      elementsSelectable: true
    });
  });
});
