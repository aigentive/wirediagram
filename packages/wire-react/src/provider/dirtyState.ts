import type { WireDiagram } from "@aigentive/wire-core";
import { canonicalWireDiagram } from "./runtimeState.js";

export interface WireDirtyBaseline {
  cleanSnapshot: string;
  pendingControlledSnapshot: string | null;
}

export function createWireDirtyBaseline(diagram: WireDiagram): WireDirtyBaseline {
  return {
    cleanSnapshot: canonicalWireDiagram(diagram),
    pendingControlledSnapshot: null
  };
}

export function markWireDiagramClean(baseline: WireDirtyBaseline, diagram: WireDiagram): void {
  baseline.cleanSnapshot = canonicalWireDiagram(diagram);
  baseline.pendingControlledSnapshot = null;
}

export function markProviderControlledEdit(baseline: WireDirtyBaseline, diagram: WireDiagram): void {
  baseline.pendingControlledSnapshot = canonicalWireDiagram(diagram);
}

export function consumeProviderControlledEcho(baseline: WireDirtyBaseline, diagram: WireDiagram): boolean {
  const snapshot = canonicalWireDiagram(diagram);
  if (baseline.pendingControlledSnapshot !== snapshot) return false;
  baseline.pendingControlledSnapshot = null;
  return true;
}

export function wireDiagramIsDirty(baseline: WireDirtyBaseline, diagram: WireDiagram): boolean {
  return baseline.cleanSnapshot !== canonicalWireDiagram(diagram);
}
