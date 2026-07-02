import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test("wire-native canvas renders and edits without third-party graph DOM", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await gotoOk(page, "/quickstart");
  await page.getByRole("button", { name: "Preview" }).nth(2).click();
  await expect(page.locator("[data-wire-node]").first()).toBeVisible();
  await expect.poll(() => page.locator("[data-wire-edge]").count()).toBeGreaterThan(0);
  await expect(page.locator(".react-flow")).toHaveCount(0);

  const sourceHandle = page.locator("button[data-wire-source-handle='true']:not([disabled])").first();
  await expect(sourceHandle).toBeVisible();
  const sourceNodeId = await sourceHandle.getAttribute("data-wire-node-id");
  expect(sourceNodeId).toBeTruthy();

  const firstNode = sourceHandle.locator("xpath=ancestor::*[@data-wire-node][1]");
  await firstNode.click();
  await expect(firstNode.locator("[aria-selected='true']")).toHaveCount(1);

  const beforeDrag = await firstNode.boundingBox();
  expect(beforeDrag).toBeTruthy();
  await page.mouse.move(beforeDrag!.x + beforeDrag!.width / 2, beforeDrag!.y + beforeDrag!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    beforeDrag!.x + beforeDrag!.width / 2 + 80,
    beforeDrag!.y + beforeDrag!.height / 2 + 32,
    { steps: 8 }
  );
  await page.mouse.up();
  await page.waitForTimeout(250);
  const afterDrag = await firstNode.boundingBox();
  expect(afterDrag).toBeTruthy();
  expect(Math.abs(afterDrag!.x - beforeDrag!.x) + Math.abs(afterDrag!.y - beforeDrag!.y)).toBeGreaterThan(20);

  const targetHandle = page.locator(
    `button[data-wire-target-handle='true'][data-wire-node-id]:not([data-wire-node-id='${sourceNodeId}'])`
  ).last();
  await expect(targetHandle).toBeVisible();
  const beforeEdges = await page.locator("[data-wire-edge]").count();
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  expect(sourceBox).toBeTruthy();
  expect(targetBox).toBeTruthy();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => page.locator("[data-wire-edge]").count()).toBeGreaterThan(beforeEdges);

  expect(errors).toEqual([]);
});

test("edit canvas keeps manual card layout stable while panning", async ({ page }) => {
  const diagram = {
    version: 1,
    id: "drag-pan-stability",
    title: "Drag Pan Stability",
    layout: "LR",
    nodes: [
      { id: "plan", kind: "trigger", title: "1. Plan", description: "Sketch the approach." },
      { id: "code", kind: "action", title: "2. Code", description: "Write the change.", from: "plan" },
      { id: "test", kind: "action", title: "3. Test", description: "Run the suite.", from: "code" },
      { id: "ship", kind: "end", title: "4. Ship", description: "Deploy.", from: "test" }
    ],
    edges: []
  };
  await gotoOk(page, `/edit/inline?d=${Buffer.from(JSON.stringify(diagram)).toString("base64url")}`);

  const canvas = page.locator("[data-wire-canvas]").first();
  const code = canvas.locator("[data-wire-node][data-wire-node-id='code']");
  await expect(code).toBeVisible();

  const beforeDrag = await code.boundingBox();
  expect(beforeDrag).toBeTruthy();
  await page.mouse.move(beforeDrag!.x + beforeDrag!.width / 2, beforeDrag!.y + beforeDrag!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    beforeDrag!.x + beforeDrag!.width / 2 + 48,
    beforeDrag!.y + beforeDrag!.height / 2 + 160,
    { steps: 12 }
  );
  await page.mouse.up();

  await expect.poll(async () => {
    const snapshot = await canvasSnapshot(page);
    return snapshot.nodes.find((node) => node.id === "code")?.style ?? "";
  }).toContain("top:");

  const afterDrag = await canvasSnapshot(page);
  const codeStyle = afterDrag.nodes.find((node) => node.id === "code")?.style ?? "";
  expect(codeStyle).not.toContain("left: 330px; top: 20px");
  expect(afterDrag.nodes.every((node) => node.style.includes("left:") && node.style.includes("top:"))).toBe(true);

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).toBeTruthy();
  const panStart = {
    x: canvasBox!.x + canvasBox!.width / 2,
    y: canvasBox!.y + canvasBox!.height - 120
  };
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 140, panStart.y, { steps: 10 });
  await page.mouse.up();

  const afterPan = await canvasSnapshot(page);
  expect(afterPan.nodes).toEqual(afterDrag.nodes);
  expect(afterPan.edges).toEqual(afterDrag.edges);
  expect(afterPan.viewport).not.toEqual(afterDrag.viewport);
});

test("install docs show single package install", async ({ page }) => {
  await gotoOk(page, "/install");
  await expect(page.getByText("npm install @aigentive/wire-react")).toBeVisible();
  await expect(page.locator(".react-flow")).toHaveCount(0);
});

test("view-mode layout previews can zoom and pan", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await gotoOk(page, "/examples/layouts");

  const canvas = page.locator("[data-wire-canvas]").first();
  const node = canvas.locator("[data-wire-node]").first();
  await expect(canvas.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(canvas.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect(node).toBeVisible();

  const beforeZoom = await node.boundingBox();
  expect(beforeZoom).toBeTruthy();
  await canvas.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(async () => {
    const box = await node.boundingBox();
    return box?.width ?? 0;
  }).toBeGreaterThan(beforeZoom!.width + 5);

  const beforeWheel = await node.boundingBox();
  const wheelCanvasBox = await canvas.boundingBox();
  expect(beforeWheel).toBeTruthy();
  expect(wheelCanvasBox).toBeTruthy();
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const wheelPoint = visibleCanvasPoint(wheelCanvasBox!, viewport);
  const scrollBeforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.move(wheelPoint.x, wheelPoint.y);
  await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeWheel);
  await expect.poll(async () => {
    const box = await node.boundingBox();
    return box?.width ?? 0;
  }).toBeGreaterThan(beforeWheel!.width * 1.05);
  const afterWheel = await node.boundingBox();
  expect(afterWheel).toBeTruthy();
  expect(afterWheel!.width).toBeLessThan(beforeWheel!.width * 1.15);

  const beforePan = await node.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(beforePan).toBeTruthy();
  expect(canvasBox).toBeTruthy();
  const panStart = visibleCanvasPoint(canvasBox!, viewport);

  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 90, panStart.y + 24, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => {
    const afterPan = await node.boundingBox();
    if (!afterPan) return 0;
    return Math.abs(afterPan.x - beforePan!.x) + Math.abs(afterPan.y - beforePan!.y);
  }).toBeGreaterThan(30);

  expect(errors).toEqual([]);
});

async function gotoOk(page: Page, path: string): Promise<void> {
  await expect.poll(async () => {
    const response = await page.goto(path);
    return response?.status() ?? 0;
  }, { timeout: 20_000 }).toBe(200);
}

function visibleCanvasPoint(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(box.x + 120, box.x + 24), box.x + box.width - 24),
    y: Math.min(Math.max(box.y + 140, 80), Math.min(box.y + box.height - 80, viewport.height - 80))
  };
}

async function canvasSnapshot(page: Page): Promise<{
  viewport: string | null;
  nodes: Array<{ id: string | null; style: string }>;
  edges: Array<string | null>;
}> {
  return page.evaluate(() => ({
    viewport: document.querySelector("[data-wire-canvas] > div")?.getAttribute("style") ?? null,
    nodes: [...document.querySelectorAll("[data-wire-node]")]
      .map((node) => ({
        id: node.getAttribute("data-wire-node-id"),
        style: node.getAttribute("style") ?? ""
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    edges: [...document.querySelectorAll("[data-wire-edge] path:first-child")].map((path) => path.getAttribute("d"))
  }));
}
