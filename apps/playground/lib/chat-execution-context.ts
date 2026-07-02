import type { CurrentUser } from "@/lib/current-user";

export type WireChatSurface = "playground" | "wires";

export type WireChatExecutionContext = {
  user: CurrentUser | null;
  surface: WireChatSurface;
};

export function resolveWireChatExecutionContext({
  headers,
  trustedUser,
  trustedSurface
}: {
  headers?: Headers;
  trustedUser: CurrentUser | null;
  trustedSurface?: WireChatSurface;
}): WireChatExecutionContext {
  void headers;
  return {
    user: trustedUser,
    surface: trustedSurface ?? "playground"
  };
}
