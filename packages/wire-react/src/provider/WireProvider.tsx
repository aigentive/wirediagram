import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  applyWireAction,
  applyWireActions,
  emptyDiagram,
  validate,
  type ApplyWireActionResult,
  type WireAction,
  type WireDiagram
} from "@aigentive/wire-core";
import {
  DEFAULT_VIEWPORT,
  EMPTY_SELECTION,
  WireContext,
  type WireActions
} from "./context.js";
import {
  consumeProviderControlledEcho,
  createWireDirtyBaseline,
  markProviderControlledEdit,
  markWireDiagramClean,
  wireDiagramIsDirty
} from "./dirtyState.js";
import {
  canonicalWireDiagram,
  normalizeWireSelection,
  normalizeWireViewport,
  sameWireDiagram,
  sameWireSelection,
  sameWireViewport
} from "./runtimeState.js";
import type {
  WireMode,
  WireProviderProps,
  WireSelection,
  WireViewport
} from "./types.js";

type CommitOptions = {
  pushHistory?: boolean;
  dirtyCause?: "edit" | "undo" | "redo";
};

export function WireProvider({
  diagram,
  defaultDiagram,
  onChange,
  onAction,
  onEvent,
  validateOnChange = true,
  history = true,
  selection,
  defaultSelection,
  onSelectionChange,
  viewport,
  defaultViewport,
  onViewportChange,
  mode,
  defaultMode = "edit",
  onModeChange,
  dirty,
  defaultDirty = false,
  onDirtyChange,
  children
}: WireProviderProps): ReactElement {
  const [internalDiagram, setInternalDiagram] = useState<WireDiagram>(
    () => defaultDiagram ?? emptyDiagram()
  );
  const [internalSelection, setInternalSelection] = useState<WireSelection>(
    () => normalizeWireSelection(defaultSelection ?? EMPTY_SELECTION)
  );
  const [internalViewport, setInternalViewport] = useState<WireViewport>(
    () => normalizeWireViewport(defaultViewport ?? DEFAULT_VIEWPORT)
  );
  const [internalMode, setInternalMode] = useState<WireMode>(defaultMode);
  const [internalDirty, setInternalDirty] = useState(defaultDirty);
  const [undoStack, setUndoStack] = useState<WireAction[]>([]);
  const [redoStack, setRedoStack] = useState<WireAction[]>([]);

  const currentDiagram = diagram ?? internalDiagram;
  const currentSelection = useMemo(
    () => normalizeWireSelection(selection ?? internalSelection),
    [internalSelection, selection]
  );
  const currentViewport = useMemo(
    () => normalizeWireViewport(viewport ?? internalViewport),
    [internalViewport, viewport]
  );
  const currentMode = mode ?? internalMode;
  const currentDirty = dirty ?? internalDirty;
  const dirtyBaselineRef = useRef(createWireDirtyBaseline(currentDiagram));
  const previousControlledDiagramSnapshotRef = useRef<string | null>(
    diagram === undefined ? null : canonicalWireDiagram(diagram)
  );
  const previousControlledDirtyRef = useRef<boolean | undefined>(dirty);
  const validation = useMemo(() => validate(currentDiagram), [currentDiagram]);

  useEffect(() => {
    if (diagram === undefined) {
      previousControlledDiagramSnapshotRef.current = null;
      return;
    }

    const snapshot = canonicalWireDiagram(diagram);
    if (previousControlledDiagramSnapshotRef.current === snapshot) return;
    previousControlledDiagramSnapshotRef.current = snapshot;

    if (consumeProviderControlledEcho(dirtyBaselineRef.current, diagram)) return;
    if (dirty !== true) {
      markWireDiagramClean(dirtyBaselineRef.current, diagram);
      if (dirty === undefined) setInternalDirty(false);
    }
  }, [diagram, dirty]);

  useEffect(() => {
    const previousDirty = previousControlledDirtyRef.current;
    previousControlledDirtyRef.current = dirty;
    if (previousDirty === true && dirty === false) {
      markWireDiagramClean(dirtyBaselineRef.current, currentDiagram);
    }
  }, [currentDiagram, dirty]);

  const notifyDirty = useCallback(
    (nextDirty: boolean, event: {
      source?: "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";
      previousDirty?: boolean;
      cause?: "edit" | "undo" | "redo" | "reset" | "api";
    } = {}) => {
      if (currentDirty === nextDirty) return;
      const previousDirty = event.previousDirty ?? currentDirty;
      if (dirty === undefined) setInternalDirty(nextDirty);
      onDirtyChange?.(nextDirty, {
        source: event.source ?? "api",
        dirty: nextDirty,
        previousDirty,
        cause: event.cause ?? "api"
      });
    },
    [currentDirty, dirty, onDirtyChange]
  );

  const setProviderSelection = useCallback(
    (nextSelection: WireSelection, event: {
      source?: "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";
      previousSelection?: WireSelection;
      cause?: "node" | "edge" | "pane" | "keyboard" | "api";
    } = {}) => {
      const normalized = normalizeWireSelection(nextSelection);
      if (sameWireSelection(currentSelection, normalized)) return;
      const previousSelection = normalizeWireSelection(event.previousSelection ?? currentSelection);
      if (selection === undefined) setInternalSelection(normalized);
      onSelectionChange?.(normalized, {
        type: "selection.change",
        source: event.source ?? "api",
        selection: normalized,
        previousSelection,
        cause: event.cause ?? "api"
      });
    },
    [currentSelection, onSelectionChange, selection]
  );

  const clearProviderSelection = useCallback(
    (event: Parameters<typeof setProviderSelection>[1] = {}) => {
      setProviderSelection(EMPTY_SELECTION, event);
    },
    [setProviderSelection]
  );

  const setProviderViewport = useCallback(
    (nextViewport: WireViewport, event: {
      source?: "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";
      previousViewport?: WireViewport;
      cause?: "pan" | "zoom" | "fit-view" | "keyboard" | "api";
      intent?: "fit-view" | "fit-selection";
    } = {}) => {
      const normalized = normalizeWireViewport(nextViewport);
      if (sameWireViewport(currentViewport, normalized)) return;
      const previousViewport = normalizeWireViewport(event.previousViewport ?? currentViewport);
      if (viewport === undefined) setInternalViewport(normalized);
      onViewportChange?.(normalized, {
        source: event.source ?? "api",
        viewport: normalized,
        previousViewport,
        cause: event.cause ?? "api",
        intent: event.intent
      });
    },
    [currentViewport, onViewportChange, viewport]
  );

  const setProviderMode = useCallback(
    (nextMode: WireMode, event: {
      source?: "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";
      previousMode?: WireMode;
      cause?: "toolbar" | "keyboard" | "api";
    } = {}) => {
      if (currentMode === nextMode) return;
      const previousMode = event.previousMode ?? currentMode;
      if (mode === undefined) setInternalMode(nextMode);
      onModeChange?.(nextMode, {
        source: event.source ?? "api",
        mode: nextMode,
        previousMode,
        cause: event.cause ?? "api"
      });
    },
    [currentMode, mode, onModeChange]
  );

  const markClean = useCallback(
    (event: {
      source?: "canvas" | "node-card" | "node-list" | "option-panel" | "validation-panel" | "workspace" | "api";
      previousDirty?: boolean;
      cause?: "reset" | "api";
    } = {}) => {
      markWireDiagramClean(dirtyBaselineRef.current, currentDiagram);
      notifyDirty(false, {
        source: event.source ?? "api",
        previousDirty: event.previousDirty,
        cause: event.cause ?? "reset"
      });
    },
    [currentDiagram, notifyDirty]
  );

  const commit = useCallback(
    (action: WireAction, options: CommitOptions = {}): ApplyWireActionResult => {
      const result = applyWireAction(currentDiagram, action, {
        validate: validateOnChange,
        inverse: history
      });
      if (sameWireDiagram(currentDiagram, result.diagram)) return result;
      if (diagram === undefined) {
        setInternalDiagram(result.diagram);
      } else {
        markProviderControlledEdit(dirtyBaselineRef.current, result.diagram);
      }
      if (history && options.pushHistory !== false && result.inverse) {
        setUndoStack((stack) => [...stack, result.inverse!]);
        setRedoStack([]);
      }
      onAction?.(action, result);
      onChange?.(result.diagram, { action, result });
      notifyDirty(wireDiagramIsDirty(dirtyBaselineRef.current, result.diagram), {
        source: "api",
        cause: options.dirtyCause ?? "edit"
      });
      return result;
    },
    [currentDiagram, diagram, history, notifyDirty, onAction, onChange, validateOnChange]
  );

  const commitMany = useCallback(
    (wireActions: WireAction[]): ApplyWireActionResult => {
      const result = applyWireActions(currentDiagram, wireActions, { validate: validateOnChange, inverse: history });
      if (sameWireDiagram(currentDiagram, result.diagram)) return result;
      if (diagram === undefined) {
        setInternalDiagram(result.diagram);
      } else {
        markProviderControlledEdit(dirtyBaselineRef.current, result.diagram);
      }
      if (history && result.inverse) {
        setUndoStack((stack) => [...stack, result.inverse!]);
        setRedoStack([]);
      }
      for (const action of wireActions) {
        onAction?.(action, result);
      }
      onChange?.(result.diagram, { actions: wireActions, result });
      notifyDirty(wireDiagramIsDirty(dirtyBaselineRef.current, result.diagram), {
        source: "api",
        cause: "edit"
      });
      return result;
    },
    [currentDiagram, diagram, history, notifyDirty, onAction, onChange, validateOnChange]
  );

  const actions: WireActions = useMemo(
    () => ({
      dispatch: commit,
      dispatchMany: commitMany,
      validate: () => validate(currentDiagram)
    }),
    [commit, commitMany, currentDiagram]
  );

  const eventActions = useMemo(
    () => ({
      emit: onEvent ?? (() => undefined)
    }),
    [onEvent]
  );

  const historyActions = useMemo(
    () => ({
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undo: () => {
        const action = undoStack.at(-1);
        if (!action) return undefined;
        const result = commit(action, { pushHistory: false, dirtyCause: "undo" });
        setUndoStack((stack) => stack.slice(0, -1));
        if (result.inverse) setRedoStack((stack) => [...stack, result.inverse!]);
        return result;
      },
      redo: () => {
        const action = redoStack.at(-1);
        if (!action) return undefined;
        const result = commit(action, { pushHistory: false, dirtyCause: "redo" });
        setRedoStack((stack) => stack.slice(0, -1));
        if (result.inverse) setUndoStack((stack) => [...stack, result.inverse!]);
        return result;
      }
    }),
    [commit, redoStack, undoStack]
  );

  const value = useMemo(
    () => ({
      diagram: currentDiagram,
      validation,
      selection: currentSelection,
      viewport: currentViewport,
      mode: currentMode,
      history: { undoStack, redoStack },
      dirty: currentDirty,
      actions,
      selectionActions: {
        setSelection: setProviderSelection,
        clearSelection: clearProviderSelection
      },
      viewportActions: { setViewport: setProviderViewport },
      eventActions,
      historyActions,
      setMode: setProviderMode,
      markClean
    }),
    [
      actions,
      clearProviderSelection,
      currentDiagram,
      currentDirty,
      currentMode,
      currentSelection,
      currentViewport,
      eventActions,
      historyActions,
      redoStack,
      setProviderMode,
      setProviderSelection,
      setProviderViewport,
      undoStack,
      validation,
      markClean
    ]
  );

  return <WireContext.Provider value={value}>{children}</WireContext.Provider>;
}
