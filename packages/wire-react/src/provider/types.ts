import type {
  ApplyWireActionResult,
  ValidationResult,
  WireAction,
  WireDiagram
} from "@aigentive/wire-core";

export type WireMode = "view" | "edit" | "connect" | "comment";
export type WireEventSource = "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";

type WireSelectionCause = "node" | "edge" | "pane" | "keyboard" | "api";
type WireViewportCause = "pan" | "zoom" | "fit-view" | "keyboard" | "api";
type WireViewportIntent = "fit-view" | "fit-selection";
type WireModeCause = "toolbar" | "keyboard" | "api";
type WireDirtyCause = "edit" | "undo" | "redo" | "reset" | "api";

export type WireEvent =
  | { type: "node.click"; source: WireEventSource; nodeId: string; input?: "pointer" | "keyboard" }
  | { type: "node.inspect"; source: WireEventSource; nodeId: string; input?: "pointer" | "keyboard" }
  | { type: "edge.click"; source: WireEventSource; edgeId: string; input?: "pointer" | "keyboard"; intent?: "select" | "inspect" }
  | { type: "pane.click"; source: WireEventSource }
  | {
    type: "selection.change";
    source: WireEventSource;
    selection: WireSelection;
    previousSelection?: WireSelection;
    cause?: WireSelectionCause;
  };

export interface WireSelection {
  nodeIds: string[];
  edgeIds: string[];
}

export interface WireViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WireChangeEvent {
  action?: WireAction;
  actions?: WireAction[];
  result: ApplyWireActionResult;
}

export interface WireHistoryState {
  undoStack: WireAction[];
  redoStack: WireAction[];
}

export interface WireHistoryActions {
  canUndo: boolean;
  canRedo: boolean;
  undo(): ApplyWireActionResult | undefined;
  redo(): ApplyWireActionResult | undefined;
}

export interface WireSelectionActions {
  setSelection(selection: WireSelection, event?: {
    source?: WireEventSource;
    previousSelection?: WireSelection;
    cause?: WireSelectionCause;
  }): void;
  clearSelection(event?: {
    source?: WireEventSource;
    previousSelection?: WireSelection;
    cause?: WireSelectionCause;
  }): void;
}

export interface WireViewportActions {
  setViewport(viewport: WireViewport, event?: {
    source?: WireEventSource;
    previousViewport?: WireViewport;
    cause?: WireViewportCause;
    intent?: WireViewportIntent;
  }): void;
}

export interface WireEventActions {
  emit(event: WireEvent): void;
}

export interface WireProviderProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
  onEvent?: (event: WireEvent) => void;
  validateOnChange?: boolean;
  history?: boolean;
  selection?: WireSelection;
  defaultSelection?: WireSelection;
  onSelectionChange?: (selection: WireSelection, event: Extract<WireEvent, { type: "selection.change" }>) => void;
  viewport?: WireViewport;
  defaultViewport?: WireViewport;
  onViewportChange?: (viewport: WireViewport, event: {
    source: WireEventSource;
    viewport: WireViewport;
    previousViewport?: WireViewport;
    cause?: WireViewportCause;
    intent?: WireViewportIntent;
  }) => void;
  mode?: WireMode;
  defaultMode?: WireMode;
  onModeChange?: (mode: WireMode, event: {
    source: WireEventSource;
    mode: WireMode;
    previousMode?: WireMode;
    cause?: WireModeCause;
  }) => void;
  dirty?: boolean;
  defaultDirty?: boolean;
  onDirtyChange?: (dirty: boolean, event: {
    source: WireEventSource;
    dirty: boolean;
    previousDirty?: boolean;
    cause?: WireDirtyCause;
  }) => void;
  children: React.ReactNode;
}

export interface WireReactState {
  diagram: WireDiagram;
  validation: ValidationResult;
  selection: WireSelection;
  viewport: WireViewport;
  mode: WireMode;
  history: WireHistoryState;
  dirty: boolean;
}
