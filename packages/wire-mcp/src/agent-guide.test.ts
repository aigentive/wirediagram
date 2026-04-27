import { describe, expect, it } from "vitest";
import { WIRE_AGENT_GUIDE } from "./agent-guide.js";

describe("Wire agent guide", () => {
  it("documents tool prefix mapping and core operating path", () => {
    expect(WIRE_AGENT_GUIDE).toContain("wire__create_diagram");
    expect(WIRE_AGENT_GUIDE).toContain("apply_actions");
    expect(WIRE_AGENT_GUIDE).toContain("update_edge");
    expect(WIRE_AGENT_GUIDE).toContain("fromHandle");
    expect(WIRE_AGENT_GUIDE).toContain("toHandle");
    expect(WIRE_AGENT_GUIDE).toContain("Hosted Persistence Contract");
    expect(WIRE_AGENT_GUIDE).toContain("validate");
    expect(WIRE_AGENT_GUIDE).toContain("render_preview");
    expect(WIRE_AGENT_GUIDE).toContain("@aigentive/wire-react");
  });
});
