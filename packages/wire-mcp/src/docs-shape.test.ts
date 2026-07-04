import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseWireDiagram, validate } from "@aigentive/wire-core";
import {
  LLM_AGENT_GUIDE_MD,
  LLM_DOCS_EXAMPLES,
  LLM_DOCS_RECIPES,
  WIRE_DOCS_MANIFEST,
  getLlmDocsShape,
  getLlmDocsTopic,
  listLlmDocsExamples,
  listLlmDocsRecipes
} from "./docs-shape.js";

describe("LLM docs shape", () => {
  it("exposes stable agent entrypoints", () => {
    expect(WIRE_DOCS_MANIFEST.discovery.llmDocs).toBe("/llm/wire-docs.shape.json");
    expect(WIRE_DOCS_MANIFEST.discovery.agentGuide).toBe("/llm/agent-guide.md");
    expect(WIRE_DOCS_MANIFEST.discovery.schema).toBe("/llm/schema/wire-diagram.json");
    expect(getLlmDocsTopic("react.shape.json")?.id).toBe("wire.react");
    expect(getLlmDocsTopic("cli.shape.json")?.id).toBe("wire.cli");
    expect(getLlmDocsTopic("skill.shape.json")?.files).toContain("docs/llm/SKILL.md");
    expect(getLlmDocsTopic("mcp")?.tools?.some((tool) => tool.name === "v1_get_docs_shape")).toBe(true);
    expect(getLlmDocsTopic("cloud")?.routes?.some((route) => route.path === "/api/user/openai-key")).toBe(true);
  });

  it("selects compact topics from task text", () => {
    const react = getLlmDocsShape({ task: "Build a React canvas and save to Wire Cloud" });
    expect(react.topics.map((topic) => topic.id)).toContain("wire.react");
    expect(react.topics.map((topic) => topic.id)).toContain("wire.cloud");

    const repair = getLlmDocsShape({ task: "Fix invalid JSON from a Zod validation error" });
    expect(repair.topics.map((topic) => topic.id)).toContain("wire.validation");

    const cli = getLlmDocsShape({ task: "Validate and export a diagram from the CLI" });
    expect(cli.topics.map((topic) => topic.id)).toContain("wire.cli");
  });

  it("documents every registered MCP tool in the docs shape", () => {
    const serverSource = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    const registeredTools = [...serverSource.matchAll(/server\.registerTool\(\s*\n\s*"([^"]+)"/g)]
      .map((match) => match[1])
      .sort();
    const documentedTools = (getLlmDocsTopic("mcp")?.tools ?? [])
      .map((tool) => tool.name)
      .sort();

    expect(documentedTools).toEqual(registeredTools);
  });

  it("keeps examples parseable and valid", () => {
    expect(listLlmDocsExamples()).toEqual([
      "approval-flow",
      "mcp-tool-call-flow",
      "rag-pipeline",
      "support-triage"
    ]);

    for (const [name, example] of Object.entries(LLM_DOCS_EXAMPLES)) {
      const parsed = parseWireDiagram(example);
      const result = validate(parsed);
      expect(result.valid, `${name}: ${JSON.stringify(result.issues)}`).toBe(true);
    }
  });

  it("keeps fast-start recipes discoverable", () => {
    expect(listLlmDocsRecipes()).toEqual(expect.arrayContaining([
      "branch-condition-flow",
      "create-wire-diagram",
      "edit-with-wire-actions",
      "embed-react-viewer",
      "group-nodes",
      "render-for-review",
      "style-cards-and-edges",
      "validate-and-repair"
    ]));
    for (const [id, recipe] of Object.entries(LLM_DOCS_RECIPES)) {
      expect(recipe).toHaveProperty("id");
      expect(recipe).toHaveProperty("goal");
      expect(recipe).toHaveProperty("preferredPath");
      expect(JSON.stringify(recipe), id).toContain("/llm/");
    }
  });

  it("documents every stable validation code", () => {
    const validateSource = readFileSync(new URL("../../wire-core/src/validate.ts", import.meta.url), "utf8");
    const sourceCodes = [...new Set([...validateSource.matchAll(/code:\s*"([^"]+)"/g)].map((match) => match[1]))].sort();
    const documentedCodes = (getLlmDocsTopic("validation")?.validationRules ?? []).map((rule) => rule.code).sort();
    for (const code of sourceCodes) {
      expect(documentedCodes, code).toContain(code);
    }
  });

  it("keeps the guide prompt-ready", () => {
    expect(LLM_AGENT_GUIDE_MD).toContain("wire__create_diagram");
    expect(LLM_AGENT_GUIDE_MD).toContain("v1_get_docs_shape");
    expect(LLM_AGENT_GUIDE_MD).toContain("data.card");
    expect(LLM_AGENT_GUIDE_MD).toContain("Wiring Rules");
    expect(LLM_AGENT_GUIDE_MD).toContain("@aigentive/wire-react");
    expect(LLM_AGENT_GUIDE_MD).toContain("@aigentive/wire-cli");
    expect(LLM_AGENT_GUIDE_MD).toContain("docs/llm/SKILL.md");
    expect(LLM_AGENT_GUIDE_MD).toContain("Hosted Persistence Contract");
    expect(LLM_AGENT_GUIDE_MD).toContain("/api/user/openai-key");
    expect(listLlmDocsRecipes()).toContain("connect-local-mcp");
    expect(LLM_AGENT_GUIDE_MD).not.toMatch(/\b(Claude|Cursor)\b/i);
  });
});
