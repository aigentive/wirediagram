import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("wire-react package CSS export", () => {
  it("declares package CSS as an exported side-effect file", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    ) as {
      exports: Record<string, unknown>;
      files: string[];
      sideEffects: string[];
      scripts: Record<string, string>;
    };

    expect(packageJson.exports["./styles.css"]).toBe("./dist/styles.css");
    expect(packageJson.sideEffects).toContain("./src/styles.css");
    expect(packageJson.sideEffects).toContain("./dist/styles.css");
    expect(packageJson.files).toContain("dist");
    expect(packageJson.scripts.clean).toBe("node scripts/build.mjs --clean");
    expect(packageJson.scripts.build).toBe("node scripts/build.mjs");
  });

  it("authors package-owned classes for current React surfaces", async () => {
    const css = await readFile(new URL("./styles.css", import.meta.url), "utf8");

    expect(css).toContain(".wire-workspace");
    expect(css).toContain(".wire-canvas");
    expect(css).toContain(".wire-inspector");
    expect(css).toContain(".wire-option-panel");
    expect(css).toContain(".wire-node-card");
    expect(css).toContain(".wire-toolbar");
    expect(css).toContain(".wire-theme-system");
    expect(css).toContain("prefers-reduced-motion");
  });
});
