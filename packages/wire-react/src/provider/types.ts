import type {
  ApplyWireActionResult,
  ValidationResult,
  WireAction,
  WireDiagram
} from "@aigentive/wire-core";

export type WireMode = "view" | "edit" | "connect" | "comment";

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

export interface WireProviderProps {
  diagram?: WireDiagram;
  defaultDiagram?: WireDiagram;
  onChange?: (diagram: WireDiagram, event: WireChangeEvent) => void;
  onAction?: (action: WireAction, result: ApplyWireActionResult) => void;
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
