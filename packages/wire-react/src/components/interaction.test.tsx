// @vitest-environment happy-dom

import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyWireAction, emptyDiagram, validate, type ApplyWireActionResult, type ValidationResult, type WireAction, type WireDiagram } from "@aigentive/wire-core";
import { WireContext, DEFAULT_VIEWPORT, EMPTY_SELECTION, type WireContextValue } from "../provider/context.js";
import type { WireEvent, WireSelection } from "../provider/types.js";
import { WireInspector } from "./WireInspector.js";
import { WireNodeList } from "./WireNodeList.js";
import { WireOptionPanel } from "./WireOptionPanel.js";
import { WirePalette } from "./WirePalette.js";
import { WireToolbar } from "./WireToolbar.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Root[] = [];

afterEach(() => {
  for (const root of mounted.splice(0)) {
    act(() => root.unmount());
  }
  document.body.innerHTML = "";
});

describe("wire component interactions", () => {
  it("dispatches node.add actions from the palette with stable ids and condition branches", () => {
    const actions: WireAction[] = [];
    const diagram: WireDiagram = {
      ...emptyDiagram({ id: "palette", title: "Palette" }),
      nodes: [{ id: "action-1", kind: "action", title: "Existing" }]
    };
    const { container } = renderWithContext(<WirePalette kinds={["action", "condition"]} />, contextFor(diagram, {
      dispatch: (action) => {
        actions.push(action);
        return applyResult(diagram, action);
      }
    }));

    click(buttonByText(container, "Action"));
    click(buttonByText(container, "Condition"));

    expect(actions).toEqual([
      {
        type: "node.add",
        node: { id: "action-2", kind: "action", title: "Action", branches: undefined }
      },
      {
        type: "node.add",
        node: { id: "condition-1", kind: "condition", title: "Condition", branches: ["yes", "no"] }
      }
    ]);
  });

  it("emits node-list events and updates selection on click", () => {
    const events: WireEvent[] = [];
    const selections: WireSelection[] = [];
    const diagram: WireDiagram = {
      ...emptyDiagram({ id: "list", title: "List" }),
      nodes: [
        { id: "start", kind: "trigger", title: "Start" },
        { id: "group", kind: "group", title: "Hidden group" }
      ]
    };
    const { container } = renderWithContext(
      <WireNodeList includeGroups renderItem={({ node, selected }) => <span>{node.title}:{String(selected)}</span>} />,
      contextFor(diagram, {
        selection: { nodeIds: ["group"], edgeIds: [] },
        setSelection: (selection) => selections.push(selection),
        emit: (event) => events.push(event)
      })
    );

    expect(container.textContent).toContain("Hidden group:true");
    click(buttonByText(container, "Start:false"));

    expect(selections).toEqual([{ nodeIds: ["start"], edgeIds: [] }]);
    expect(events.map((event) => event.type)).toEqual(["node.click", "node.inspect", "selection.change"]);
    expect(events[0]).toMatchObject({ source: "node-list", nodeId: "start" });
  });

  it("dispatches option patches for text, textarea, number, boolean, and select fields", () => {
    const actions: WireAction[] = [];
    const diagram = optionDiagram();
    const { container } = renderWithContext(
      <WireOptionPanel
        catalog={{
          action: [
            { key: "owner", label: "Owner" },
            { key: "notes", label: "Notes", type: "textarea" },
            { key: "retries", label: "Retries", type: "number" },
            { key: "enabled", label: "Enabled", type: "boolean" },
            { key: "mode", label: "Mode", type: "select", options: ["fast", { label: "Careful", value: "careful" }] }
          ]
        }}
      />,
      contextFor(diagram, {
        selection: { nodeIds: ["task"], edgeIds: [] },
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    const textInput = container.querySelector<HTMLInputElement>("input:not([type])")!;
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
    const numberInput = container.querySelector<HTMLInputElement>("input[type='number']")!;
    const checkbox = container.querySelector<HTMLInputElement>("input[type='checkbox']")!;
    const select = container.querySelector<HTMLSelectElement>("select")!;

    input(textInput, "Grace");
    input(textarea, "");
    input(numberInput, "4");
    click(checkbox);
    change(select, "careful");

    expect(actions).toHaveLength(5);
    expect(actions[0]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: { owner: "Grace" } } } });
    expect(actions[1]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: expect.not.objectContaining({ notes: expect.anything() }) } } });
    expect(actions[2]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: { retries: 4 } } } });
    expect(actions[3]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: { enabled: false } } } });
    expect(actions[4]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: { mode: "careful" } } } });
  });

  it("dispatches inspector title, description, preset, custom style, clear, and reset patches", () => {
    const actions: WireAction[] = [];
    const diagram: WireDiagram = {
      ...emptyDiagram({ id: "inspect", title: "Inspect" }),
      nodes: [
        {
          id: "task",
          kind: "action",
          title: "Task",
          description: "Old description",
          tone: "error",
          style: { fill: "#fff1f2", stroke: "#fb7185", textColor: "#881337" }
        }
      ]
    };
    const { container } = renderWithContext(
      <WireInspector />,
      contextFor(diagram, {
        selection: { nodeIds: ["task"], edgeIds: [] },
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    const titleInput = container.querySelector<HTMLInputElement>("label input:not([type])")!;
    const description = container.querySelector<HTMLTextAreaElement>("textarea")!;
    const select = container.querySelector<HTMLSelectElement>("select")!;
    const fillText = container.querySelector<HTMLInputElement>("input[aria-label='Fill color']")!;
    const radius = [...container.querySelectorAll<HTMLInputElement>("input[type='number']")].at(1)!;
    const shadow = container.querySelector<HTMLInputElement>("input[type='checkbox']")!;

    input(titleInput, "New task");
    input(description, "");
    change(select, "success");
    input(fillText, "#111827");
    input(radius, "8");
    click(shadow);
    click(buttonByText(container, "Clear"));
    click(buttonByText(container, "Reset"));

    expect(actions).toHaveLength(8);
    expect(actions[0]).toMatchObject({ patch: { title: "New task" } });
    expect(actions[1]).toMatchObject({ patch: { description: null } });
    expect(actions[2]).toMatchObject({
      patch: { tone: "success", style: { fill: "#ecfdf5", stroke: "#34d399", textColor: "#064e3b" } }
    });
    expect(actions[3]).toMatchObject({ patch: { tone: null, style: { stroke: "#fb7185", textColor: "#881337", fill: "#111827" } } });
    expect(actions[4]).toMatchObject({ patch: { tone: null, style: expect.objectContaining({ borderRadius: 8 }) } });
    expect(actions[5]).toMatchObject({ patch: { tone: null, style: expect.objectContaining({ shadow: false }) } });
    expect(actions[6]).toMatchObject({ patch: { tone: null, style: expect.not.objectContaining({ fill: expect.anything() }) } });
    expect(actions[7]).toMatchObject({ patch: { tone: null, style: null } });
  });

  it("wires toolbar mode, history, and layout actions", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const setMode = vi.fn();
    const diagram = emptyDiagram({ id: "toolbar", title: "Toolbar" });
    const { container } = renderWithContext(
      <WireToolbar />,
      contextFor(diagram, {
        canUndo: true,
        canRedo: true,
        undo,
        redo,
        setMode
      })
    );

    click(buttonByLabel(container, "Undo"));
    click(buttonByLabel(container, "Redo"));
    click(buttonByText(container, "View"));

    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
    expect(setMode).toHaveBeenCalledWith("view");
  });
});

function renderWithContext(element: ReactElement, value: WireContextValue): { container: HTMLDivElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push(root);
  act(() => {
    root.render(<WireContext.Provider value={value}>{element}</WireContext.Provider>);
  });
  return { container };
}

function optionDiagram(): WireDiagram {
  return {
    ...emptyDiagram({ id: "options", title: "Options" }),
    nodes: [
      {
        id: "task",
        kind: "action",
        title: "Task",
        data: { options: { owner: "Ada", notes: "Old", retries: 2, enabled: true, mode: "fast" } }
      }
    ]
  };
}

function contextFor(
  diagram: WireDiagram,
  overrides: {
    selection?: WireSelection;
    validation?: ValidationResult;
    dispatch?: (action: WireAction) => ApplyWireActionResult;
    setSelection?: (selection: WireSelection) => void;
    emit?: (event: WireEvent) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    undo?: () => ApplyWireActionResult | undefined;
    redo?: () => ApplyWireActionResult | undefined;
    setMode?: (mode: "view" | "edit" | "connect" | "comment") => void;
  } = {}
): WireContextValue {
  const validation = overrides.validation ?? validate(diagram);
  const noopResult: ApplyWireActionResult = {
    diagram,
    validation,
    changedNodeIds: [],
    changedEdgeIds: []
  };
  return {
    diagram,
    validation,
    selection: overrides.selection ?? EMPTY_SELECTION,
    viewport: DEFAULT_VIEWPORT,
    mode: "edit",
    history: { undoStack: [], redoStack: [] },
    dirty: false,
    actions: {
      dispatch: overrides.dispatch ?? (() => noopResult),
      dispatchMany: () => noopResult,
      validate: () => validation
    },
    selectionActions: {
      setSelection: overrides.setSelection ?? (() => undefined),
      clearSelection: () => undefined
    },
    viewportActions: {
      setViewport: () => undefined
    },
    eventActions: {
      emit: overrides.emit ?? (() => undefined)
    },
    historyActions: {
      canUndo: overrides.canUndo ?? false,
      canRedo: overrides.canRedo ?? false,
      undo: overrides.undo ?? (() => undefined),
      redo: overrides.redo ?? (() => undefined)
    },
    setMode: overrides.setMode ?? (() => undefined)
  };
}

function applyResult(diagram: WireDiagram, action: WireAction): ApplyWireActionResult {
  return applyWireAction(diagram, action, { validate: true, inverse: true });
}

function buttonByText(container: ParentNode, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

function buttonByLabel(container: ParentNode, label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function click(element: HTMLElement): void {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function input(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  act(() => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function change(element: HTMLSelectElement, value: string): void {
  act(() => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
  descriptor?.set?.call(element, value);
}
