import { describe, expect, it } from "vitest";
import { assertHttpSecurityConfig, type WireMcpConfig } from "./config";

describe("assertHttpSecurityConfig", () => {
  it("allows localhost HTTP without a token", () => {
    expect(() => assertHttpSecurityConfig(config({ httpHost: "127.0.0.1" }))).not.toThrow();
  });

  it("rejects unauthenticated non-loopback HTTP", () => {
    expect(() => assertHttpSecurityConfig(config({ httpHost: "0.0.0.0" }))).toThrow(
      "WIRE_HTTP_HOST binds a non-loopback interface"
    );
  });

  it("allows non-loopback HTTP when a token is configured", () => {
    expect(() => assertHttpSecurityConfig(config({ httpHost: "0.0.0.0", mcpToken: "secret-token" }))).not.toThrow();
  });

  it("allows explicit unsafe non-loopback opt-in", () => {
    expect(() =>
      assertHttpSecurityConfig(config({ httpHost: "0.0.0.0", httpUnsafeAllowRemote: true }))
    ).not.toThrow();
  });
});

function config(overrides: Partial<WireMcpConfig>): WireMcpConfig {
  return {
    storageDir: "/tmp/wire",
    httpPort: 3860,
    httpHost: "127.0.0.1",
    httpEnabled: true,
    httpUnsafeAllowRemote: false,
    mcpAllowedOrigins: [],
    defaultLayout: "LR",
    pngEnabled: false,
    agentId: "test",
    previewBase: "http://localhost:3870",
    ...overrides
  };
}
