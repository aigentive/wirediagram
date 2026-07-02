import { afterEach, describe, expect, it } from "vitest";
import { requireAppSecret } from "./app-secret";

const originalNodeEnv = process.env.NODE_ENV;
const originalAuthSecret = process.env.AUTH_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

afterEach(() => {
  setEnv("NODE_ENV", originalNodeEnv);
  setEnv("AUTH_SECRET", originalAuthSecret);
  setEnv("NEXTAUTH_SECRET", originalNextAuthSecret);
});

describe("requireAppSecret", () => {
  it("allows the local fallback outside production", () => {
    setEnv("NODE_ENV", "test");
    setEnv("AUTH_SECRET", undefined);
    setEnv("NEXTAUTH_SECRET", undefined);

    expect(requireAppSecret("test purpose")).toBe("wire-local-dev-secret");
  });

  it("fails closed in production without a configured secret", () => {
    setEnv("NODE_ENV", "production");
    setEnv("AUTH_SECRET", undefined);
    setEnv("NEXTAUTH_SECRET", undefined);

    expect(() => requireAppSecret("API key hashing")).toThrow(
      "API key hashing requires AUTH_SECRET or NEXTAUTH_SECRET in production."
    );
  });

  it("uses AUTH_SECRET when configured", () => {
    setEnv("NODE_ENV", "production");
    setEnv("AUTH_SECRET", "real-secret");
    setEnv("NEXTAUTH_SECRET", undefined);

    expect(requireAppSecret("test purpose")).toBe("real-secret");
  });
});

function setEnv(key: "NODE_ENV" | "AUTH_SECRET" | "NEXTAUTH_SECRET", value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
  } else {
    Reflect.set(process.env, key, value);
  }
}
