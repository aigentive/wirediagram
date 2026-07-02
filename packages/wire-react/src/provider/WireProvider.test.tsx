// @vitest-environment happy-dom

import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDiagram, type WireDiagram } from "@aigentive/wire-core";
import {
  useWireActions,
  useWireDiagram,
  useWireEvents,
  useWireHistory,
  useWireMode,
  useWireSelection,
  useWireValidation,
  useWireViewport
} from "../hooks.js";
import { WireProvider } from "./WireProvider.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Root[] = [];

afterEach(() => {
  for (const root of mounted.splice(0)) {
    act(() => root.unmount());
  }
  document.body.innerHTML = "";
});

describe("WireProvider", () => {
  it("applies actions, batches, history, selection, viewport, mode, and events", () => {
    const onChange = vi.fn();
    const onAction = vi.fn();
    const onEvent = vi.fn();
    const { container } = render(
      <WireProvider defaultDiagram={baseDiagram()} onChange={onChange} onAction={onAction} onEvent={onEvent}>
        <Harness />
      </WireProvider>
    );

    expect(container.textContent).toContain("nodes:1");
    expect(container.textContent).toContain("valid:true");

    click(button(container, "add"));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ type: "node.add" }), expect.any(Object));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ nodes: expect.arrayContaining([expect.objectContaining({ id: "code" })]) }), expect.any(Object));
    expect(container.textContent).toContain("nodes:2");
    expect(container.textContent).toContain("undo:true");

    click(button(container, "many"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ nodes: expect.arrayContaining([expect.objectContaining({ id: "review" })]) }), expect.any(Object));
    expect(container.textContent).toContain("nodes:3");

    click(button(container, "select"));
    expect(container.textContent).toContain("selection:start");
    click(button(container, "clear"));
    expect(container.textContent).toContain("selection:none");

    click(button(container, "viewport"));
    expect(container.textContent).toContain("zoom:2");
    click(button(container, "mode"));
    expect(container.textContent).toContain("mode:view");

    click(button(container, "emit"));
    expect(onEvent).toHaveBeenCalledWith({ type: "pane.click", source: "api" });

    click(button(container, "undo"));
    expect(container.textContent).toContain("redo:true");
    expect(container.textContent).toContain("nodes:2");
    click(button(container, "redo"));
    expect(container.textContent).toContain("undo:true");
    expect(container.textContent).toContain("nodes:3");
  });

  it("supports controlled diagrams and validation disabled on change", () => {
    const diagram = baseDiagram();
    const onChange = vi.fn();
    const { container } = render(
      <WireProvider diagram={diagram} onChange={onChange} validateOnChange={false} history={false}>
        <Harness />
      </WireProvider>
    );

    click(button(container, "add"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nodes: expect.arrayContaining([expect.objectContaining({ id: "code" })]) }), expect.objectContaining({
      result: expect.objectContaining({ validation: { valid: true, issues: [] } })
    }));
    expect(container.textContent).toContain("nodes:1");
    expect(container.textContent).toContain("undo:false");
  });
});

function Harness(): ReactElement {
  const diagram = useWireDiagram();
  const validation = useWireValidation();
  const actions = useWireActions();
  const history = useWireHistory();
  const [selection, selectionActions] = useWireSelection();
  const [viewport, viewportActions] = useWireViewport();
  const [mode, setMode] = useWireMode();
  const events = useWireEvents();

  return (
    <div>
      <span>nodes:{diagram.nodes.length}</span>
      <span>valid:{String(validation.valid)}</span>
      <span>selection:{selection.nodeIds[0] ?? "none"}</span>
      <span>zoom:{viewport.zoom}</span>
      <span>mode:{mode}</span>
      <span>undo:{String(history.canUndo)}</span>
      <span>redo:{String(history.canRedo)}</span>
      <button type="button" onClick={() => actions.dispatch({ type: "node.add", node: { id: "code", kind: "action", title: "Code", from: "start" } })}>add</button>
      <button
        type="button"
        onClick={() =>
          actions.dispatchMany([
            { type: "node.add", node: { id: "review", kind: "human", title: "Review", from: "code" } },
            { type: "metadata.patch", patch: { owner: "wire" } }
          ])
        }
      >
        many
      </button>
      <button type="button" onClick={() => selectionActions.setSelection({ nodeIds: ["start"], edgeIds: [] })}>select</button>
      <button type="button" onClick={selectionActions.clearSelection}>clear</button>
      <button type="button" onClick={() => viewportActions.setViewport({ x: 12, y: 24, zoom: 2 })}>viewport</button>
      <button type="button" onClick={() => setMode("view")}>mode</button>
      <button type="button" onClick={() => events.emit({ type: "pane.click", source: "api" })}>emit</button>
      <button type="button" onClick={history.undo} disabled={!history.canUndo}>undo</button>
      <button type="button" onClick={history.redo} disabled={!history.canRedo}>redo</button>
    </div>
  );
}

function baseDiagram(): WireDiagram {
  return {
    ...emptyDiagram({ id: "provider", title: "Provider" }),
    nodes: [{ id: "start", kind: "trigger", title: "Start" }]
  };
}

function render(element: ReactElement): { container: HTMLDivElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push(root);
  act(() => root.render(element));
  return { container };
}

function click(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function button(container: ParentNode, text: string): HTMLButtonElement {
  const match = [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent === text);
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}
