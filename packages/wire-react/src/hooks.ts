import { useContext } from "react";
import type { WireAction } from "@aigentive/wire-core";
import { assertWireContext, WireContext } from "./provider/context.js";

export function useWireContext() {
  return assertWireContext(useContext(WireContext));
}

export function useWireDiagram() {
  return useWireContext().diagram;
}

export function useWireValidation() {
  return useWireContext().validation;
}

export function useWireSelection() {
  const ctx = useWireContext();
  return [ctx.selection, ctx.selectionActions] as const;
}

export function useWireViewport() {
  const ctx = useWireContext();
  return [ctx.viewport, ctx.viewportActions] as const;
}

export function useWireActions() {
  return useWireContext().actions;
}

export function useWireHistory() {
  return useWireContext().historyActions;
}

export function useWireMode() {
  const ctx = useWireContext();
  return [ctx.mode, ctx.setMode] as const;
}

export function useWireDispatch() {
  const ctx = useWireContext();
  return (action: WireAction) => ctx.actions.dispatch(action);
}

export function useWireEvents() {
  return useWireContext().eventActions;
}
