import { useCallback, useMemo, useState, type ReactElement } from "react";
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
import type {
  WireMode,
  WireProviderProps,
  WireSelection,
  WireViewport
} from "./types.js";

export function WireProvider({
  diagram,
  defaultDiagram,
  onChange,
  onAction,
  validateOnChange = true,
  history = true,
  children
}: WireProviderProps): ReactElement {
  const [internalDiagram, setInternalDiagram] = useState<WireDiagram>(
    () => defaultDiagram ?? emptyDiagram()
  );
  const [selection, setSelection] = useState<WireSelection>(EMPTY_SELECTION);
  const [viewport, setViewport] = useState<WireViewport>(DEFAULT_VIEWPORT);
  const [mode, setMode] = useState<WireMode>("edit");
  const [dirty, setDirty] = useState(false);
  const [undoStack, setUndoStack] = useState<WireAction[]>([]);
  const [redoStack, setRedoStack] = useState<WireAction[]>([]);

  const currentDiagram = diagram ?? internalDiagram;
  const validation = useMemo(() => validate(currentDiagram), [currentDiagram]);

  const commit = useCallback(
    (action: WireAction, options: { pushHistory?: boolean } = {}): ApplyWireActionResult => {
      const result = applyWireAction(currentDiagram, action, {
        validate: validateOnChange,
        inverse: history
      });
      if (diagram === undefined) {
        setInternalDiagram(result.diagram);
      }
      setDirty(true);
      if (history && options.pushHistory !== false && result.inverse) {
        setUndoStack((stack) => [...stack, result.inverse!]);
        setRedoStack([]);
      }
      onAction?.(action, result);
      onChange?.(result.diagram, { action, result });
      return result;
    },
    [currentDiagram, diagram, history, onAction, onChange, validateOnChange]
  );

  const commitMany = useCallback(
    (wireActions: WireAction[]): ApplyWireActionResult => {
      const result = applyWireActions(currentDiagram, wireActions, { validate: validateOnChange, inverse: false });
      if (diagram === undefined) {
        setInternalDiagram(result.diagram);
      }
      setDirty(true);
      onChange?.(result.diagram, { actions: wireActions, result });
      return result;
    },
    [currentDiagram, diagram, onChange, validateOnChange]
  );

  const actions: WireActions = useMemo(
    () => ({
      dispatch: commit,
      dispatchMany: commitMany,
      validate: () => validate(currentDiagram)
    }),
    [commit, commitMany, currentDiagram]
  );

  const historyActions = useMemo(
    () => ({
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undo: () => {
        const action = undoStack.at(-1);
        if (!action) return undefined;
        const result = commit(action, { pushHistory: false });
        setUndoStack((stack) => stack.slice(0, -1));
        if (result.inverse) setRedoStack((stack) => [...stack, result.inverse!]);
        return result;
      },
      redo: () => {
        const action = redoStack.at(-1);
        if (!action) return undefined;
        const result = commit(action, { pushHistory: false });
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
      selection,
      viewport,
      mode,
      history: { undoStack, redoStack },
      dirty,
      actions,
      selectionActions: {
        setSelection,
        clearSelection: () => setSelection(EMPTY_SELECTION)
      },
      viewportActions: { setViewport },
      historyActions,
      setMode
    }),
    [
      actions,
      currentDiagram,
      dirty,
      historyActions,
      mode,
      redoStack,
      selection,
      undoStack,
      validation,
      viewport
    ]
  );

  return <WireContext.Provider value={value}>{children}</WireContext.Provider>;
}
