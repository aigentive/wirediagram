import type { WireDiagram } from "@aigentive/wire-core";
import type { WireSelection, WireViewport } from "./types.js";

export function normalizeWireSelection(selection: WireSelection): WireSelection {
  return {
    nodeIds: uniqueSorted(selection.nodeIds),
    edgeIds: uniqueSorted(selection.edgeIds)
  };
}

export function sameWireSelection(left: WireSelection, right: WireSelection): boolean {
  const normalizedLeft = normalizeWireSelection(left);
  const normalizedRight = normalizeWireSelection(right);
  return arraysEqual(normalizedLeft.nodeIds, normalizedRight.nodeIds)
    && arraysEqual(normalizedLeft.edgeIds, normalizedRight.edgeIds);
}

export function normalizeWireViewport(viewport: WireViewport): WireViewport {
  const next = {
    x: normalizeFiniteViewportNumber(viewport.x, "x"),
    y: normalizeFiniteViewportNumber(viewport.y, "y"),
    zoom: normalizeFiniteViewportNumber(viewport.zoom, "zoom")
  };
  if (next.zoom <= 0) {
    throw new RangeError("Wire viewport zoom must be greater than 0.");
  }
  return next;
}

export function sameWireViewport(left: WireViewport, right: WireViewport): boolean {
  const normalizedLeft = normalizeWireViewport(left);
  const normalizedRight = normalizeWireViewport(right);
  return Object.is(normalizedLeft.x, normalizedRight.x)
    && Object.is(normalizedLeft.y, normalizedRight.y)
    && Object.is(normalizedLeft.zoom, normalizedRight.zoom);
}

export function canonicalWireDiagram(diagram: WireDiagram): string {
  return JSON.stringify(stableJsonValue(diagram));
}

export function sameWireDiagram(left: WireDiagram, right: WireDiagram): boolean {
  return left === right || canonicalWireDiagram(left) === canonicalWireDiagram(right);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function normalizeFiniteViewportNumber(value: number, field: keyof WireViewport): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Wire viewport ${field} must be finite.`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableJsonValue(item));
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const child = source[key];
      if (child !== undefined) next[key] = stableJsonValue(child);
    }
    return next;
  }
  return value;
}
