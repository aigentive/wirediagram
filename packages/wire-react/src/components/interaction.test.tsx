// @vitest-environment happy-dom

import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyWireAction, emptyDiagram, validate, type ApplyWireActionResult, type ValidationResult, type WireAction, type WireDiagram } from "@aigentive/wire-core";
import { WireCanvas } from "../canvas/WireCanvas.js";
import { WireContext, DEFAULT_VIEWPORT, EMPTY_SELECTION, type WireContextValue } from "../provider/context.js";
import type { WireEvent, WireSelection } from "../provider/types.js";
import { WireInspector } from "./WireInspector.js";
import { WireNodeList } from "./WireNodeList.js";
import { WireOptionPanel } from "./WireOptionPanel.js";
import { WirePalette } from "./WirePalette.js";
import { WireToolbar } from "./WireToolbar.js";
import { WireWorkspace } from "./WireWorkspace.js";

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

  it("emits edge inspection intent from canvas edge clicks", () => {
    const events: WireEvent[] = [];
    const selections: WireSelection[] = [];
    const { container } = renderWithContext(
      <WireCanvas fitView={false} showControls={false} showMiniMap={false} />,
      contextFor(edgeDiagram(), {
        setSelection: (selection) => selections.push(selection),
        emit: (event) => events.push(event)
      })
    );

    const hitPath = container.querySelector<SVGPathElement>("[data-wire-edge-id='approval'] path[stroke='transparent']");
    if (!hitPath) throw new Error("Edge hit path not found.");
    click(hitPath);

    expect(events).toContainEqual({ type: "edge.click", source: "canvas", edgeId: "approval", intent: "inspect" });
    expect(selections).toEqual([{ nodeIds: [], edgeIds: ["approval"] }]);
  });

  it("handles canvas keyboard selection, deletion, and read-only movement from the root", () => {
    const events: WireEvent[] = [];
    const selections: WireSelection[] = [];
    const actions: WireAction[] = [];
    const { container } = renderWithContext(
      <WireCanvas fitView={false} showControls={false} showMiniMap={false} />,
      contextFor(edgeDiagram(), {
        selection: { nodeIds: [], edgeIds: ["approval"] },
        setSelection: (selection) => selections.push(selection),
        emit: (event) => events.push(event),
        dispatch: (action) => {
          actions.push(action);
          return applyResult(edgeDiagram(), action);
        }
      })
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    const node = container.querySelector<HTMLElement>("[data-wire-node-id='a']")!;
    keyDown(root, "Delete");
    expect(actions).toContainEqual({ type: "edge.remove", id: "approval" });

    focus(node);
    keyDown(root, "Enter");
    expect(events).toContainEqual({ type: "node.click", source: "canvas", nodeId: "a", input: "keyboard" });
    expect(events).toContainEqual({ type: "node.inspect", source: "canvas", nodeId: "a", input: "keyboard" });
    expect(selections).toContainEqual({ nodeIds: ["a"], edgeIds: [] });

    const readOnlyActions: WireAction[] = [];
    const readOnly = renderWithContext(
      <WireCanvas fitView={false} showControls={false} showMiniMap={false} readOnly />,
      contextFor(edgeDiagram(), {
        selection: { nodeIds: ["a"], edgeIds: [] },
        dispatch: (action) => {
          readOnlyActions.push(action);
          return applyResult(edgeDiagram(), action);
        }
      })
    );
    focus(readOnly.container.querySelector<HTMLElement>("[data-wire-node-id='a']")!);
    keyDown(readOnly.container.querySelector<HTMLElement>("[data-wire-canvas]")!, "ArrowRight");
    expect(readOnlyActions).toHaveLength(0);
  });

  it("searches canvas nodes with combobox semantics and focuses the chosen result", async () => {
    const actions: WireAction[] = [];
    const { container } = renderWithContext(
      <WireCanvas fitView={false} showControls={false} showMiniMap={false} />,
      contextFor(edgeDiagram(), {
        dispatch: (action) => {
          actions.push(action);
          return applyResult(edgeDiagram(), action);
        }
      })
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    focus(container.querySelector<HTMLElement>("[data-wire-node-id='a']")!);
    keyDown(root, "/");

    const search = container.querySelector<HTMLInputElement>("input[role='combobox']")!;
    expect(search.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("[role='listbox']")).toBeTruthy();

    input(search, "B");
    expect(container.textContent).toContain("B action node");
    keyDown(search, "Enter");
    await flush();

    expect(document.activeElement).toBe(container.querySelector<HTMLElement>("[data-wire-node-id='b']"));
    expect(actions).toHaveLength(0);
  });

  it("creates and rejects keyboard connections through the target picker", () => {
    const actions: WireAction[] = [];
    const { container } = renderWithContext(
      <WireCanvas fitView={false} showControls={false} showMiniMap={false} />,
      contextFor(edgeDiagram(), {
        dispatch: (action) => {
          actions.push(action);
          return applyResult(edgeDiagram(), action);
        }
      })
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    focus(container.querySelector<HTMLElement>("[data-wire-node-id='a']")!);
    keyDown(root, "c");

    const picker = container.querySelector<HTMLInputElement>("input[role='combobox']")!;
    expect(picker.getAttribute("aria-controls")).toBeTruthy();
    expect(container.textContent).toContain("Choose connection target");
    expect(container.textContent).toContain("B");
    keyDown(picker, "Enter");

    expect(actions).toContainEqual({
      type: "edge.connect",
      edge: { from: "a", to: "b", fromHandle: "right", toHandle: "left" }
    });

    const rejectedActions: WireAction[] = [];
    const rejected = renderWithContext(
      <WireCanvas
        fitView={false}
        showControls={false}
        showMiniMap={false}
        isValidConnection={() => "Blocked by policy."}
      />,
      contextFor(edgeDiagram(), {
        dispatch: (action) => {
          rejectedActions.push(action);
          return applyResult(edgeDiagram(), action);
        }
      })
    );
    const rejectedRoot = rejected.container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    focus(rejected.container.querySelector<HTMLElement>("[data-wire-node-id='a']")!);
    keyDown(rejectedRoot, "c");
    const rejectedPicker = rejected.container.querySelector<HTMLInputElement>("input[role='combobox']")!;
    keyDown(rejectedPicker, "Enter");

    expect(rejectedActions).toHaveLength(0);
    expect(rejectedPicker.getAttribute("aria-invalid")).toBe("true");
    expect(rejected.container.textContent).toContain("Blocked by policy.");
  });

  it("moves focus between owned workspace canvas and inspector", async () => {
    const { container } = render(
      <WireWorkspace
        diagram={edgeDiagram()}
        layout="embedded"
        defaultInspectNodeId="a"
        canvasProps={{ fitView: false, showControls: false, showMiniMap: false }}
      />
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    const node = container.querySelector<HTMLElement>("[data-wire-node-id='a']")!;
    focus(node);
    keyDown(root, "Enter", { shiftKey: true });
    await flush();

    expect(document.activeElement?.getAttribute("role")).toBe("tab");

    keyDown(document.activeElement as HTMLElement, "Enter", { altKey: true, shiftKey: true });
    await flush();

    expect(document.activeElement).toBe(node);
  });

  it("exposes skip-to-inspector as the next canvas tab stop", async () => {
    const { container } = render(
      <WireWorkspace
        diagram={edgeDiagram()}
        layout="embedded"
        canvasProps={{ fitView: false, showControls: false, showMiniMap: false }}
      />
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    const skip = buttonByLabel(container, "Skip to inspector and controls");
    let focusRequests = 0;
    root.closest("main")?.addEventListener("wire:inspector-focus-request", () => {
      focusRequests += 1;
    });
    expect(root.querySelector("button")).toBe(skip);

    focus(root);
    click(skip);
    await flush();

    expect(focusRequests).toBe(1);
    expect([
      container.querySelector("[role='tab'][aria-selected='true']"),
      container.querySelector(".wire-workspace__inspector")
    ]).toContain(document.activeElement);
  });

  it("fits selected items with shared default padding, explicit padding overrides, and focus recovery", async () => {
    const viewportEvents: Array<{ viewport: WireContextValue["viewport"]; event?: Parameters<WireContextValue["viewportActions"]["setViewport"]>[1] }> = [];
    const diagram = edgeDiagram();
    const selection: WireSelection = { nodeIds: ["a", "b"], edgeIds: ["approval"] };
    const { container } = renderWithContext(
      <WireCanvas fitView={false} showMiniMap={false} />,
      contextFor(diagram, {
        selection,
        setViewport: (viewport, event) => viewportEvents.push({ viewport, event })
      })
    );

    const root = container.querySelector<HTMLElement>("[data-wire-canvas]")!;
    setCanvasRect(root, 800, 420);
    const selectedNode = container.querySelector<HTMLElement>("[data-wire-node-id='a']")!;
    focus(selectedNode);
    click(buttonByLabel(container, "Fit view"));
    await flush();
    click(buttonByLabel(container, "Fit selection"));
    await flush();

    expect(viewportEvents).toHaveLength(2);
    expect(viewportEvents[0]?.event).toMatchObject({ source: "canvas", cause: "fit-view", intent: "fit-view" });
    expect(viewportEvents[1]?.event).toMatchObject({ source: "canvas", cause: "fit-view", intent: "fit-selection" });
    expect(viewportEvents[1]?.viewport).toEqual(viewportEvents[0]?.viewport);
    expect(document.activeElement).toBe(selectedNode);
    expect(container.textContent).toContain("Fitted 3 selected items.");

    const explicitEvents: Array<{ viewport: WireContextValue["viewport"]; event?: Parameters<WireContextValue["viewportActions"]["setViewport"]>[1] }> = [];
    const explicit = renderWithContext(
      <WireCanvas fitView={false} fitViewPadding={0.05} showMiniMap={false} />,
      contextFor(diagram, {
        selection,
        setViewport: (viewport, event) => explicitEvents.push({ viewport, event })
      })
    );
    setCanvasRect(explicit.container.querySelector<HTMLElement>("[data-wire-canvas]")!, 800, 420);
    click(buttonByLabel(explicit.container, "Fit selection"));
    await flush();

    expect(explicitEvents[0]?.event).toMatchObject({ intent: "fit-selection" });
    expect(explicitEvents[0]?.viewport.zoom).not.toBe(viewportEvents[1]?.viewport.zoom);
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

  it("supports option sections, predicates, validation, and commit modes", () => {
    const actions: WireAction[] = [];
    const commits: string[] = [];
    const diagram = optionDiagram();
    const { container } = renderWithContext(
      <WireOptionPanel
        nodeId="task"
        catalog={{
          action: [
            { key: "hidden", label: "Hidden", hidden: true },
            { key: "blurred", label: "Blurred", placeholder: "Blur value", section: "Timing", order: 1, commitMode: "blur", required: true },
            { key: "submitted", label: "Submitted", placeholder: "Submit value", section: "Timing", order: 2, commitMode: "submit" },
            { key: "locked", label: "Locked", placeholder: "Locked value", readOnly: true },
            { key: "disabled", label: "Disabled", placeholder: "Disabled value", disabled: () => true }
          ]
        }}
        onOptionCommit={({ option }) => commits.push(option.key)}
      />,
      contextFor(diagram, {
        selection: { nodeIds: ["task"], edgeIds: [] },
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    expect(container.textContent).not.toContain("Hidden");
    expect(container.textContent).toContain("Timing");

    const blurred = inputByPlaceholder(container, "Blur value");
    input(blurred, "Draft");
    input(blurred, "");
    expect(actions).toHaveLength(0);
    blur(blurred);
    expect(actions).toHaveLength(0);
    expect(container.textContent).toContain("Blurred is required.");

    input(blurred, "Ready");
    blur(blurred);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: expect.objectContaining({ blurred: "Ready" }) } } });
    expect(commits).toEqual(["blurred"]);

    const submitted = inputByPlaceholder(container, "Submit value");
    input(submitted, "Queued");
    expect(actions).toHaveLength(1);
    click(buttonByText(container, "Apply"));
    expect(actions).toHaveLength(2);
    expect(actions[1]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: expect.objectContaining({ submitted: "Queued" }) } } });
    expect(commits).toEqual(["blurred", "submitted"]);

    input(inputByPlaceholder(container, "Locked value"), "Ignored");
    input(inputByPlaceholder(container, "Disabled value"), "Ignored");
    expect(actions).toHaveLength(2);
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
    expect(actions[4]).toMatchObject({ patch: { style: expect.objectContaining({ borderRadius: 8 }) } });
    expect(actions[4].patch).not.toHaveProperty("tone");
    expect(actions[5]).toMatchObject({ patch: { style: expect.objectContaining({ shadow: false }) } });
    expect(actions[5].patch).not.toHaveProperty("tone");
    expect(actions[6]).toMatchObject({ patch: { tone: null, style: expect.not.objectContaining({ fill: expect.anything() }) } });
    expect(actions[7]).toMatchObject({ patch: { tone: null, style: null } });
  });

  it("renders inspector configure fields for explicit node ids without selection", () => {
    const actions: WireAction[] = [];
    const commits: string[] = [];
    const diagram = optionDiagram();
    const { container } = renderWithContext(
      <WireInspector
        nodeId="task"
        optionCatalog={{ action: [{ key: "owner", label: "Owner" }] }}
        onOptionCommit={({ option }) => commits.push(option.key)}
      />,
      contextFor(diagram, {
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    expect(buttonByText(container, "Configure").getAttribute("aria-selected")).toBe("true");
    input(container.querySelector<HTMLInputElement>("input:not([type])")!, "Grace");

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "node.patch", id: "task", patch: { data: { options: expect.objectContaining({ owner: "Grace" }) } } });
    expect(commits).toEqual(["owner"]);
  });

  it("renders inspector JSON and honors node-over-edge precedence", () => {
    const diagram = edgeDiagram();
    const { container } = renderWithContext(
      <WireInspector nodeId="a" edgeId="approval" />,
      contextFor(diagram)
    );

    expect(container.textContent).toContain("Style");
    expect(container.textContent).not.toContain("Edge");
    click(buttonByText(container, "JSON"));
    expect(container.textContent).toContain("\"id\": \"a\"");
  });

  it("edits explicit edge fields and renders stale edge ids as empty state", () => {
    const actions: WireAction[] = [];
    const diagram = edgeDiagram();
    const { container } = renderWithContext(
      <WireInspector edgeId="approval" />,
      contextFor(diagram, {
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    expect(buttonByText(container, "Edge").getAttribute("aria-selected")).toBe("true");
    input(container.querySelector<HTMLInputElement>("input:not([type])")!, "new label");
    change(container.querySelector<HTMLSelectElement>("select")!, "success");
    change([...container.querySelectorAll<HTMLSelectElement>("select")].at(1)!, "straight");

    expect(actions).toEqual([
      expect.objectContaining({ type: "edge.patch", id: "approval", patch: { label: "new label" } }),
      expect.objectContaining({ type: "edge.patch", id: "approval", patch: { tone: "success" } }),
      expect.objectContaining({ type: "edge.patch", id: "approval", patch: { routing: "straight" } })
    ]);

    const stale = renderWithContext(<WireInspector edgeId="missing" />, contextFor(diagram));
    expect(stale.container.textContent).toContain("No node selected");
  });

  it("keeps inspector read-only mode non-mutating", () => {
    const actions: WireAction[] = [];
    const diagram = optionDiagram();
    const { container } = renderWithContext(
      <WireInspector nodeId="task" readOnly />,
      contextFor(diagram, {
        dispatch: (action) => {
          actions.push(action);
          return applyResult(diagram, action);
        }
      })
    );

    input(container.querySelector<HTMLInputElement>("input:not([type])")!, "Blocked");
    change(container.querySelector<HTMLSelectElement>("select")!, "success");
    expect(actions).toHaveLength(0);
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
    expect(setMode).toHaveBeenCalledWith("view", { source: "workspace", previousMode: "edit", cause: "toolbar" });
  });
});

function renderWithContext(element: ReactElement, value: WireContextValue): { container: HTMLDivElement } {
  return render(<WireContext.Provider value={value}>{element}</WireContext.Provider>);
}

function render(element: ReactElement): { container: HTMLDivElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push(root);
  act(() => {
    root.render(element);
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

function edgeDiagram(): WireDiagram {
  return {
    ...emptyDiagram({ id: "edges", title: "Edges" }),
    nodes: [
      { id: "a", kind: "trigger", title: "A" },
      { id: "b", kind: "action", title: "B" }
    ],
    edges: [{ id: "approval", from: "a", to: "b", label: "old" }]
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
    setMode?: (mode: "view" | "edit" | "connect" | "comment", event?: Parameters<WireContextValue["setMode"]>[1]) => void;
    setViewport?: (viewport: WireContextValue["viewport"], event?: Parameters<WireContextValue["viewportActions"]["setViewport"]>[1]) => void;
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
      setViewport: overrides.setViewport ?? (() => undefined)
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
    setMode: overrides.setMode ?? (() => undefined),
    markClean: () => undefined
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

function focus(element: HTMLElement): void {
  act(() => {
    element.focus();
    element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });
}

function keyDown(element: HTMLElement, key: string, init: KeyboardEventInit = {}): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
}

function setCanvasRect(element: HTMLElement, width: number, height: number): void {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({})
  });
}

function input(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  act(() => {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function blur(element: HTMLElement): void {
  act(() => {
    element.focus();
    element.blur();
    element.dispatchEvent(new FocusEvent("blur"));
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

function inputByPlaceholder(container: ParentNode, placeholder: string): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);
  if (!input) throw new Error(`Input not found: ${placeholder}`);
  return input;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      if (typeof requestAnimationFrame === "undefined") {
        setTimeout(resolve, 0);
        return;
      }
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  });
}
