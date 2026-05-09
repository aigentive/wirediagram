import { describe, expect, it } from "vitest";
import type { WireNode } from "@aigentive/wire-core";
import {
  patchWireOption,
  readWireOption,
  wireNodeOptions,
  wireOptionSpecsForNode,
  type WireOptionCatalog
} from "./options.js";

const aiNode: WireNode = {
  id: "plan",
  kind: "ai",
  title: "Plan",
  model: "gpt-4.1",
  data: {
    owner: "runtime",
    options: {
      temperature: 0.2
    }
  }
};

describe("wire option metadata", () => {
  it("collects wildcard and kind-specific option specs", () => {
    const catalog: WireOptionCatalog = {
      "*": [{ key: "owner", storage: "data" }],
      ai: [{ key: "temperature", type: "number" }]
    };

    expect(wireOptionSpecsForNode(catalog, aiNode).map((spec) => spec.key)).toEqual([
      "owner",
      "temperature"
    ]);
  });

  it("reads values from node fields, data fields, and data.options", () => {
    expect(readWireOption(aiNode, { key: "model", storage: "node" })).toBe("gpt-4.1");
    expect(readWireOption(aiNode, { key: "owner", storage: "data" })).toBe("runtime");
    expect(readWireOption(aiNode, { key: "temperature" })).toBe(0.2);
    expect(wireNodeOptions(aiNode)).toEqual({ temperature: 0.2 });
  });

  it("patches nested option values without replacing unrelated data", () => {
    expect(patchWireOption(aiNode, { key: "temperature" }, 0.4)).toEqual({
      data: {
        owner: "runtime",
        options: {
          temperature: 0.4
        }
      }
    });

    expect(patchWireOption(aiNode, { key: "temperature" }, null)).toEqual({
      data: {
        owner: "runtime"
      }
    });
  });
});
