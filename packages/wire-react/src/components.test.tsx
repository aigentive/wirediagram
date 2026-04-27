import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyDiagram } from "@aigentive/wire-core";
import { WirePalette } from "./components/WirePalette.js";
import { WireToolbar } from "./components/WireToolbar.js";
import { WireValidationPanel } from "./components/WireValidationPanel.js";
import { WireProvider } from "./provider/WireProvider.js";

describe("shared editor components", () => {
  it("renders the complete default node palette with library styling", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WirePalette />
      </WireProvider>
    );

    expect(markup).toContain("Add node");
    expect(markup).toContain("Retrieval");
    expect(markup).toContain("Memory");
    expect(markup).toContain("Guardrail");
    expect(markup).toContain("Group");
    expect(markup).toContain("border-radius:8px");
  });

  it("renders toolbar controls without browser-default button styling", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WireToolbar />
      </WireProvider>
    );

    expect(markup).toContain("aria-label=\"Undo\"");
    expect(markup).toContain("cursor:not-allowed");
    expect(markup).toContain("View");
  });

  it("renders validation status as a styled panel", () => {
    const markup = renderToStaticMarkup(
      <WireProvider diagram={emptyDiagram()}>
        <WireValidationPanel />
      </WireProvider>
    );

    expect(markup).toContain("Valid");
    expect(markup).toContain("color:#166534");
    expect(markup).toContain("border-radius:8px");
  });
});
