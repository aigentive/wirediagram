import { emptyDiagram } from "../../packages/wire-core/dist/index.js";

const KINDS = ["trigger", "action", "ai", "tool", "condition", "human", "end"];

export function createWireReactPerformanceFixture({ name, nodeCount, edgeCount }) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    kind: index === 0 ? "trigger" : KINDS[index % KINDS.length],
    title: `${name} node ${index}`,
    description: index % 5 === 0 ? `Fixture node ${index}` : undefined,
    position: {
      x: (index % 50) * 260,
      y: Math.floor(index / 50) * 140
    }
  }));

  const edges = [];
  for (let index = 0; index < edgeCount; index += 1) {
    const fromIndex = index % nodeCount;
    let toIndex = (index * 7 + 1) % nodeCount;
    if (toIndex === fromIndex) toIndex = (toIndex + 1) % nodeCount;
    edges.push({
      id: `edge-${index}`,
      from: `node-${fromIndex}`,
      to: `node-${toIndex}`,
      label: index % 4 === 0 ? `path ${index}` : undefined,
      fromHandle: "right",
      toHandle: "left"
    });
  }

  return {
    ...emptyDiagram({ id: name, title: `${name} performance fixture`, layout: "LR" }),
    nodes,
    edges
  };
}

export const wireReactPerformanceFixtures = [
  { name: "wire-react-500", nodeCount: 500, edgeCount: 600 },
  { name: "wire-react-1000", nodeCount: 1000, edgeCount: 1200 },
  { name: "wire-react-2000-fallback", nodeCount: 2000, edgeCount: 2400, fallback: true }
];
