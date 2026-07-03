import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WireCanvas, WireProvider } from "../packages/wire-react/dist/index.js";
import {
  createWireReactPerformanceFixture,
  wireReactPerformanceFixtures
} from "../tests/performance/wire-react-fixtures.mjs";

const baselinePath = "tests/performance/baselines/wire-react-current.json";
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const fixtureConfigs = new Map(wireReactPerformanceFixtures.map((fixture) => [fixture.name, fixture]));
const fixtures = new Map(
  wireReactPerformanceFixtures.map((fixture) => [
    fixture.name,
    createWireReactPerformanceFixture(fixture)
  ])
);

const results = [];
const failures = [];

validateBaselineShape(baseline);

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

  const sampleCount = entry.sampleCount;
  const measured = measureInteraction(fixture, entry.interaction, sampleCount);
  const result = {
    ...entry,
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

mkdirSync(".cache/wire-react-performance", { recursive: true });
writeFileSync(
  ".cache/wire-react-performance/latest.json",
  `${JSON.stringify({
    schemaVersion: baseline.schemaVersion,
    package: baseline.package,
    generatedAt: new Date().toISOString(),
    results
  }, null, 2)}\n`
);

for (const result of results) {
  console.log(`${result.fixture}/${result.interaction}: median=${result.measuredMedian.toFixed(2)}ms p95=${result.measuredP95.toFixed(2)}ms`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

function measureInteraction(diagram, interaction, sampleCount) {
  const warmups = sampleCount === 1 ? 0 : 3;
  for (let index = 0; index < warmups; index += 1) runInteraction(diagram, interaction);
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const start = performance.now();
    runInteraction(diagram, interaction);
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  return {
    samples,
    median: percentile(samples, 0.5),
    p95: percentile(samples, 0.95)
  };
}

function runInteraction(diagram, interaction) {
  if (interaction === "initial-render") {
    renderCanvas(diagram, { showControls: false, showMiniMap: false });
    return;
  }
  if (interaction === "selection-update") {
    renderCanvas(diagram, { showControls: false, showMiniMap: false }, {
      selection: { nodeIds: [diagram.nodes[Math.floor(diagram.nodes.length / 2)]?.id ?? "node-0"], edgeIds: [] }
    });
    return;
  }
  if (interaction === "viewport-update") {
    renderCanvas(diagram, { showControls: false, showMiniMap: false }, {
      viewport: { x: -640, y: -320, zoom: 0.82 }
    });
    return;
  }
  if (interaction === "minimap-on") {
    renderCanvas(diagram, { showControls: false, showMiniMap: true });
    return;
  }
  if (interaction === "search-filter") {
    filterDiagramItems(diagram, "node 4");
    return;
  }
  if (interaction === "connection-picker") {
    connectionPickerTargets(diagram, "node");
    return;
  }
  if (interaction === "fallback-render-smoke") {
    renderCanvas(diagram, { showControls: false, showMiniMap: false });
    filterDiagramItems(diagram, "node 19");
    connectionPickerTargets(diagram, "node 19");
    return;
  }
  throw new Error(`Unknown performance interaction: ${interaction}`);
}

function renderCanvas(diagram, canvasProps = {}, providerProps = {}) {
  return renderToStaticMarkup(
    React.createElement(
      WireProvider,
      { diagram, ...providerProps },
      React.createElement(WireCanvas, { fitView: false, keyboardA11y: true, ...canvasProps })
    )
  );
}

function filterDiagramItems(diagram, query) {
  const normalized = query.toLowerCase();
  return [
    ...diagram.nodes.filter((node) => `${node.title} ${node.id}`.toLowerCase().includes(normalized)),
    ...diagram.edges.filter((edge) => `${edge.label ?? ""} ${edge.id} ${edge.from} ${edge.to}`.toLowerCase().includes(normalized))
  ];
}

function connectionPickerTargets(diagram, query) {
  const normalized = query.toLowerCase();
  const source = diagram.nodes[0];
  if (!source) return [];
  return diagram.nodes
    .slice(1)
    .map((node, index) => ({
      id: node.id,
      title: node.title,
      index,
      distance: squaredDistance(source.position ?? { x: 0, y: 0 }, node.position ?? { x: 0, y: 0 })
    }))
    .filter((node) => `${node.title} ${node.id}`.toLowerCase().includes(normalized))
    .sort((left, right) => left.distance - right.distance || left.index - right.index);
}

function squaredDistance(left, right) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function percentile(samples, percentileValue) {
  if (samples.length === 0) return 0;
  const index = Math.min(samples.length - 1, Math.ceil(samples.length * percentileValue) - 1);
  return samples[index];
}

function validateBaselineShape(value) {
  if (value.schemaVersion !== 1) throw new Error("Unsupported wire-react performance baseline schema.");
  if (value.package !== "@aigentive/wire-react") throw new Error("Performance baseline package mismatch.");
  if (!Array.isArray(value.entries) || value.entries.length === 0) throw new Error("Performance baseline has no entries.");
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
  }
}
