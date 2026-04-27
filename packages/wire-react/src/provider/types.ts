import type {
  ApplyWireActionResult,
  ValidationResult,
  WireAction,
  WireDiagram
} from "@aigentive/wire-core";

export type WireMode = "view" | "edit" | "connect" | "comment";
export type WireEventSource = "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";

export type WireEvent =
  | { type: "node.click"; source: WireEventSource; nodeId: string }
  | { type: "node.inspect"; source: WireEventSource; nodeId: string }
  | { type: "edge.click"; source: WireEventSource; edgeId: string }
  | { type: "pane.click"; source: WireEventSource }
  | { type: "selection.change"; source: WireEventSource; selection: WireSelection };

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
  setSelection(selection: WireSelection): void;
  clearSelection(): void;
}

export interface WireViewportActions {
  setViewport(viewport: WireViewport): void;
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
