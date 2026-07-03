export const WIRE_INSPECTOR_FOCUS_REQUEST_EVENT = "wire:inspector-focus-request";

export interface WireWorkspaceFocusItem {
  type: "node" | "edge";
  id: string;
}

export interface WireInspectorFocusRequestDetail {
  item: WireWorkspaceFocusItem | null;
}

export function dispatchWireInspectorFocusRequest(
  target: HTMLElement,
  detail: WireInspectorFocusRequestDetail
): boolean {
  return target.dispatchEvent(
    new CustomEvent<WireInspectorFocusRequestDetail>(WIRE_INSPECTOR_FOCUS_REQUEST_EVENT, {
      bubbles: true,
      cancelable: true,
      detail
    })
  );
}
