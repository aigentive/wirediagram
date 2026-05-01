import { describe, expect, it } from "vitest";
import { miniMapViewportRect, resolveWireCanvasInteraction } from "./WireCanvas.js";

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

describe("miniMapViewportRect", () => {
  const bounds = {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 500,
    width: 1000,
    height: 500
  };

  it("uses the measured canvas size for the visible viewport", () => {
    expect(
      miniMapViewportRect({
        bounds,
        viewport: { x: -200, y: -100, zoom: 2 },
        canvasSize: { width: 800, height: 400 },
        pad: 8,
        scale: 0.1
      })
    ).toEqual({
      x: 18,
      y: 13,
      width: 40,
      height: 20
    });
  });

  it("clips the visible viewport to the minimap content bounds", () => {
    expect(
      miniMapViewportRect({
        bounds,
        viewport: { x: 200, y: -50, zoom: 1 },
        canvasSize: { width: 400, height: 200 },
        pad: 8,
        scale: 0.1
      })
    ).toEqual({
      x: 8,
      y: 13,
      width: 20,
      height: 20
    });
  });

  it("omits the viewport indicator until the canvas is measurable", () => {
    expect(
      miniMapViewportRect({
        bounds,
        viewport: { x: 0, y: 0, zoom: 1 },
        pad: 8,
        scale: 0.1
      })
    ).toBeNull();
  });
});
