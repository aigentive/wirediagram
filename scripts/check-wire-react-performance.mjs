import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import * as esbuild from "esbuild";
import {
  createWireReactPerformanceFixture,
  wireReactPerformanceFixtures
} from "../tests/performance/wire-react-fixtures.mjs";

const baselinePath = "tests/performance/baselines/wire-react-current.json";
const cacheDir = ".cache/wire-react-performance";
const entryPath = `${cacheDir}/browser-entry.mjs`;
const latestPath = `${cacheDir}/latest.json`;
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const fixtureConfigs = new Map(wireReactPerformanceFixtures.map((fixture) => [fixture.name, fixture]));
const fixtures = new Map(
  wireReactPerformanceFixtures.map((fixture) => [
    fixture.name,
    createWireReactPerformanceFixture(fixture)
  ])
);

validateBaselineShape(baseline);
mkdirSync(cacheDir, { recursive: true });
writeFileSync(entryPath, browserEntrySource());

const bundle = await esbuild.build({
  entryPoints: [entryPath],
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  target: ["chrome120"],
  define: {
    "process.env.NODE_ENV": "\"production\""
  }
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const browserVersion = browser.version();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.setContent(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>wire-react performance</title>
    <style>
      html, body, #root { width: 100%; height: 100%; margin: 0; }
      body { overflow: hidden; font-family: ui-sans-serif, system-ui, sans-serif; }
      #root { contain: strict; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>${escapeScript(bundle.outputFiles[0].text)}</script>
  </body>
</html>`);

await page.waitForFunction(() => Boolean(window.__wireReactPerformance));
await page.evaluate((serializedFixtures) => {
  window.__wireReactPerformance.loadFixtures(serializedFixtures);
}, Object.fromEntries(fixtures));

const results = [];
const failures = [];
const currentCommit = currentGitCommit();

for (const entry of baseline.entries) {
  const config = fixtureConfigs.get(entry.fixture);
  const fixture = fixtures.get(entry.fixture);
  if (!config || !fixture) {
    failures.push(`Missing fixture for baseline entry ${entry.fixture}`);
    continue;
  }
  if (fixture.nodes.length !== entry.nodeCount || fixture.edges.length !== entry.edgeCount) {
    failures.push(`Fixture count mismatch for ${entry.fixture}/${entry.interaction}`);
    continue;
  }

  const measured = await page.evaluate((browserEntry) => {
    return window.__wireReactPerformance.measure(browserEntry);
  }, {
    fixture: entry.fixture,
    interaction: entry.interaction,
    sampleCount: entry.sampleCount
  });

  const result = {
    ...entry,
    commitSha: currentCommit,
    browserEngine: `chromium-${browserVersion}`,
    rawSamples: measured.samples,
    measuredMedian: measured.median,
    measuredP95: measured.p95,
    measuredAt: new Date().toISOString()
  };
  results.push(result);
  if (entry.blocking && measured.p95 > entry.thresholdMs) {
    failures.push(`${entry.fixture}/${entry.interaction} p95 ${measured.p95.toFixed(2)}ms exceeded ${entry.thresholdMs}ms`);
  }
}

await browser.close();

writeFileSync(
  latestPath,
  `${JSON.stringify({
    schemaVersion: baseline.schemaVersion,
    package: baseline.package,
    generatedAt: new Date().toISOString(),
    ciRunner: ciRunner(),
    browserEngine: `chromium-${browserVersion}`,
    productionBuild: true,
    results
  }, null, 2)}\n`
);

for (const result of results) {
  console.log(`${result.fixture}/${result.interaction}: median=${result.measuredMedian.toFixed(2)}ms p95=${result.measuredP95.toFixed(2)}ms`);
}

if (errors.length > 0) {
  failures.push(`Browser console/page errors:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

function browserEntrySource() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { WireCanvas, WireProvider } from "../../packages/wire-react/dist/index.js";

const fixtures = new Map();
const host = document.getElementById("root");
let root = createRoot(host);
let appState = null;

window.__wireReactPerformance = {
  loadFixtures(serializedFixtures) {
    fixtures.clear();
    for (const [name, diagram] of Object.entries(serializedFixtures)) fixtures.set(name, diagram);
  },
  async measure(entry) {
    const warmups = entry.sampleCount === 1 ? 0 : 3;
    for (let index = 0; index < warmups; index += 1) await runInteraction(entry.fixture, entry.interaction);
    const samples = [];
    for (let index = 0; index < entry.sampleCount; index += 1) {
      const start = performance.now();
      await runInteraction(entry.fixture, entry.interaction);
      samples.push(performance.now() - start);
    }
    samples.sort((left, right) => left - right);
    return {
      samples,
      median: percentile(samples, 0.5),
      p95: percentile(samples, 0.95)
    };
  }
};

async function runInteraction(fixtureName, interaction) {
  const diagram = fixtures.get(fixtureName);
  if (!diagram) throw new Error("Missing browser fixture " + fixtureName);

  if (interaction === "initial-render") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    assertCanvasReady();
    return;
  }
  if (interaction === "selection-update") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    await updateApp({ selection: { nodeIds: [middleNodeId(diagram)], edgeIds: [] } });
    assertCanvasReady();
    return;
  }
  if (interaction === "viewport-update") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    await updateApp({ viewport: { x: -640, y: -320, zoom: 0.82 } });
    assertCanvasReady();
    return;
  }
  if (interaction === "minimap-on") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    await updateApp({ showMiniMap: true });
    assertElement(".wire-minimap");
    return;
  }
  if (interaction === "search-filter") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    const canvas = assertElement("[data-wire-canvas]");
    canvas.focus();
    fireKey(canvas, "/");
    await flushMicrotasks();
    const input = assertElement("input[role='combobox']");
    setInputValue(input, searchNeedle(diagram));
    await flushMicrotasks();
    assertElement("[role='listbox']");
    return;
  }
  if (interaction === "connection-picker") {
    await mount(diagram, { showControls: false, showMiniMap: false });
    const firstNode = assertElement("[data-wire-node][data-wire-node-id='node-0']");
    firstNode.focus();
    fireKey(assertElement("[data-wire-canvas]"), "c");
    await flushMicrotasks();
    const input = assertElement("input[role='combobox']");
    setInputValue(input, searchNeedle(diagram));
    await flushMicrotasks();
    assertElement("[role='listbox']");
    return;
  }
  if (interaction === "fit-selection") {
    await mount(diagram, {
      showControls: true,
      showMiniMap: false,
      selection: { nodeIds: [middleNodeId(diagram)], edgeIds: [] }
    });
    click(assertElement("button[aria-label='Fit selection']"));
    await flushMicrotasks();
    assertCanvasReady();
    return;
  }
  if (interaction === "fallback-render-smoke") {
    await mount(diagram, {
      showControls: true,
      showMiniMap: true,
      selection: { nodeIds: [middleNodeId(diagram)], edgeIds: [] }
    });
    assertElement("[data-wire-large-diagram='true']");
    assertElement("[data-wire-minimap-mode='large']");
    assertElement("button[aria-label='Skip to inspector and controls']");
    const canvas = assertElement("[data-wire-canvas]");
    canvas.focus();
    fireKey(canvas, "/");
    await flushMicrotasks();
    setInputValue(assertElement("input[role='combobox']"), searchNeedle(diagram));
    await flushMicrotasks();
    assertElement("[role='listbox']");
    return;
  }
  throw new Error("Unknown performance interaction: " + interaction);
}

async function mount(diagram, options = {}) {
  appState = {
    diagram,
    selection: options.selection ?? { nodeIds: [], edgeIds: [] },
    viewport: options.viewport ?? { x: 0, y: 0, zoom: 1 },
    showControls: options.showControls ?? true,
    showMiniMap: options.showMiniMap ?? false
  };
  flushSync(() => {
    root.render(React.createElement(PerformanceApp, { state: appState }));
  });
  await flushMicrotasks();
}

async function updateApp(patch) {
  appState = { ...appState, ...patch };
  flushSync(() => {
    root.render(React.createElement(PerformanceApp, { state: appState }));
  });
  await flushMicrotasks();
}

function PerformanceApp({ state }) {
  return React.createElement(
    "div",
    { style: { width: "1280px", height: "760px" } },
    React.createElement(
      WireProvider,
      {
        diagram: state.diagram,
        selection: state.selection,
        viewport: state.viewport,
        onSelectionChange: (selection) => {
          appState = { ...appState, selection };
        },
        onViewportChange: (viewport) => {
          appState = { ...appState, viewport };
        }
      },
      React.createElement(WireCanvas, {
        fitView: false,
        keyboardA11y: true,
        showControls: state.showControls,
        showMiniMap: state.showMiniMap
      })
    )
  );
}

function assertCanvasReady() {
  assertElement("[data-wire-canvas]");
  assertElement("[data-wire-node]");
}

function assertElement(selector) {
  const element = document.querySelector(selector);
  if (!element) throw new Error("Missing element " + selector);
  return element;
}

function middleNodeId(diagram) {
  return diagram.nodes[Math.floor(diagram.nodes.length / 2)]?.id ?? diagram.nodes[0]?.id ?? "node-0";
}

function searchNeedle(diagram) {
  return "node " + Math.max(1, diagram.nodes.length - 1);
}

function fireKey(element, key) {
  flushSync(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true
    }));
  });
}

function click(element) {
  flushSync(() => {
    element.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  });
}

function setInputValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  flushSync(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function flushMicrotasks() {
  await Promise.resolve();
}

function percentile(samples, percentileValue) {
  if (samples.length === 0) return 0;
  const index = Math.min(samples.length - 1, Math.ceil(samples.length * percentileValue) - 1);
  return samples[index];
}
`;
}

function validateBaselineShape(value) {
  if (value.schemaVersion !== 1) throw new Error("Unsupported wire-react performance baseline schema.");
  if (value.package !== "@aigentive/wire-react") throw new Error("Performance baseline package mismatch.");
  if (!Array.isArray(value.entries) || value.entries.length === 0) throw new Error("Performance baseline has no entries.");
  const seen = new Set();
  for (const entry of value.entries) {
    for (const key of [
      "fixture",
      "nodeCount",
      "edgeCount",
      "interaction",
      "pathOwner",
      "commitSha",
      "ciRunner",
      "browserEngine",
      "sampleCount",
      "median",
      "p95",
      "thresholdMs",
      "largeDiagramMode",
      "blocking"
    ]) {
      if (!(key in entry)) throw new Error(`Performance baseline entry missing ${key}.`);
    }
    const id = `${entry.fixture}/${entry.interaction}`;
    if (seen.has(id)) throw new Error(`Duplicate performance baseline entry ${id}.`);
    seen.add(id);
    if (!entry.pathOwner || typeof entry.pathOwner !== "string") throw new Error(`Invalid path owner for ${id}.`);
    if (!entry.commitSha || typeof entry.commitSha !== "string") throw new Error(`Invalid commit SHA for ${id}.`);
    if (!entry.ciRunner || typeof entry.ciRunner !== "string") throw new Error(`Invalid CI runner for ${id}.`);
    if (!entry.browserEngine || typeof entry.browserEngine !== "string") throw new Error(`Invalid browser engine for ${id}.`);
    if (!Number.isInteger(entry.sampleCount) || entry.sampleCount <= 0) throw new Error(`Invalid sample count for ${id}.`);
    if (typeof entry.thresholdMs !== "number" || entry.thresholdMs <= 0) throw new Error(`Invalid threshold for ${id}.`);
    if (typeof entry.largeDiagramMode !== "boolean") throw new Error(`Invalid large diagram flag for ${id}.`);
    if (typeof entry.blocking !== "boolean") throw new Error(`Invalid blocking flag for ${id}.`);
  }
}

function currentGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function ciRunner() {
  if (process.env.GITHUB_ACTIONS === "true") return "github-actions";
  return "local";
}

function escapeScript(source) {
  return source.replaceAll("</script", "<\\/script");
}
