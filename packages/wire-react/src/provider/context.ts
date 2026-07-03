import { createContext } from "react";
import type {
  ApplyWireActionResult,
  ValidationResult,
  WireAction,
  WireDiagram
} from "@aigentive/wire-core";
import type {
  WireHistoryActions,
  WireEventActions,
  WireEventSource,
  WireMode,
  WireReactState,
  WireSelection,
  WireSelectionActions,
  WireViewport,
  WireViewportActions
} from "./types.js";

export interface WireActions {
  dispatch(action: WireAction): ApplyWireActionResult;
  dispatchMany(actions: WireAction[]): ApplyWireActionResult;
  validate(): ValidationResult;
}

export interface WireContextValue extends WireReactState {
  actions: WireActions;
  selectionActions: WireSelectionActions;
  viewportActions: WireViewportActions;
  eventActions: WireEventActions;
  historyActions: WireHistoryActions;
  setMode(mode: WireMode, event?: {
    source?: WireEventSource;
    previousMode?: WireMode;
    cause?: "toolbar" | "keyboard" | "api";
  }): void;
  markClean(event?: {
    source?: WireEventSource;
    previousDirty?: boolean;
    cause?: "reset" | "api";
  }): void;
}

export const WireContext = createContext<WireContextValue | null>(null);

export const EMPTY_SELECTION: WireSelection = { nodeIds: [], edgeIds: [] };
export const DEFAULT_VIEWPORT: WireViewport = { x: 0, y: 0, zoom: 1 };

export function assertWireContext(value: WireContextValue | null): WireContextValue {
  if (!value) {
    throw new Error("Wire hooks must be used within <WireProvider>.");
  }
  return value;
}

export type { WireDiagram, WireAction };
