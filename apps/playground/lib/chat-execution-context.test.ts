import { describe, expect, it } from "vitest";
import { resolveWireChatExecutionContext } from "./chat-execution-context";
import type { CurrentUser } from "./current-user";

const user: CurrentUser = {
  key: "auth-user-key-1234567890",
  email: "user@example.com",
  name: null,
  image: null
};

describe("resolveWireChatExecutionContext", () => {
  it("ignores forged public chat identity and surface headers", () => {
    const headers = new Headers({
      "x-wire-user-key": "forged-user-key-123456",
      "x-wire-user-email": "attacker@example.com",
      "x-wire-chat-surface": "wires"
    });

    expect(resolveWireChatExecutionContext({ headers, trustedUser: null })).toEqual({
      user: null,
      surface: "playground"
    });
  });

  it("uses only server-supplied authenticated context for wires chat", () => {
    expect(resolveWireChatExecutionContext({ trustedUser: user, trustedSurface: "wires" })).toEqual({
      user,
      surface: "wires"
    });
  });
});
