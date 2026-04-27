import { mkdir, readFile, writeFile, readdir, rm, stat, rename } from "node:fs/promises";
import { join } from "node:path";
import {
  parseWireDiagram,
  emptyDiagram,
  type WireDiagram
} from "@aigentive/wire-core";

/**
 * Per-id mutex map. Serializes writes to the same diagram so concurrent
 * tool calls (parallel add_node + connect on the same diagram) don't race
 * load → mutate → save and silently lose edits.
 */
function makeKeyedMutex() {
  const queues = new Map<string, Promise<unknown>>();
  return {
    async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const prev = queues.get(key) ?? Promise.resolve();
      const next = prev.catch(() => undefined).then(fn);
      const cleanup = next.catch(() => undefined).then(() => {
        if (queues.get(key) === cleanup) queues.delete(key);
      });
      queues.set(key, cleanup);
      return next;
    }
  };
}

export interface DiagramSummary {
  id: string;
  title?: string;
  nodes: number;
  layout: WireDiagram["layout"];
  updatedAt: string;
}

export interface StorageBackend {
  list(): Promise<DiagramSummary[]>;
  load(id: string): Promise<WireDiagram>;
  save(id: string, diagram: WireDiagram): Promise<WireDiagram>;
  mutate(id: string, mutator: (diagram: WireDiagram) => Promise<WireDiagram> | WireDiagram): Promise<WireDiagram>;
  exists(id: string): Promise<boolean>;
  remove(id: string): Promise<void>;
  /** Returns the absolute filesystem path for a diagram (or undefined for in-memory). */
  pathFor(id: string): string | undefined;
}

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

function assertSafeId(id: string): void {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Diagram id "${id}" contains unsafe characters. Allowed: A-Z, a-z, 0-9, '-', '_'.`);
  }
}

export class FileStorage implements StorageBackend {
  private readonly mutex = makeKeyedMutex();

  constructor(private readonly dir: string) {}

  pathFor(id: string): string {
    assertSafeId(id);
    return join(this.dir, `${id}.json`);
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async exists(id: string): Promise<boolean> {
    try {
      await stat(this.pathFor(id));
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<DiagramSummary[]> {
    await this.ensureDir();
    const files = (await readdir(this.dir)).filter((f) => f.endsWith(".json"));
    const out: DiagramSummary[] = [];
    for (const file of files) {
      try {
        const path = join(this.dir, file);
        const raw = await readFile(path, "utf8");
        const diagram = parseWireDiagram(JSON.parse(raw));
        const id = file.replace(/\.json$/, "");
        const fileStat = await stat(path);
        out.push({
          id,
          title: diagram.title,
          nodes: diagram.nodes.length,
          layout: diagram.layout,
          updatedAt: fileStat.mtime.toISOString()
        });
      } catch {
        // Skip unreadable / invalid files; never fail listing.
      }
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async load(id: string): Promise<WireDiagram> {
    return this.mutex.run(id, () => this.loadUnlocked(id));
  }

  async save(id: string, diagram: WireDiagram): Promise<WireDiagram> {
    return this.mutex.run(id, () => this.saveUnlocked(id, diagram));
  }

  async mutate(
    id: string,
    mutator: (diagram: WireDiagram) => Promise<WireDiagram> | WireDiagram
  ): Promise<WireDiagram> {
    return this.mutex.run(id, async () => {
      const current = await this.loadUnlocked(id);
      const next = await mutator(current);
      return this.saveUnlocked(id, next);
    });
  }

  async remove(id: string): Promise<void> {
    return this.mutex.run(id, async () => {
      await rm(this.pathFor(id), { force: true });
    });
  }

  private async loadUnlocked(id: string): Promise<WireDiagram> {
    const path = this.pathFor(id);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "ENOENT") {
        throw new Error(`Diagram "${id}" not found.`);
      }
      throw err;
    }
    const parsed = parseWireDiagram(JSON.parse(raw));
    if (!parsed.id) parsed.id = id;
    return parsed;
  }

  private async saveUnlocked(id: string, diagram: WireDiagram): Promise<WireDiagram> {
    await this.ensureDir();
    // Re-parse so callers passing arbitrary JSON can't bypass schema
    // validation by going through the storage layer.
    const validated = parseWireDiagram(diagram);
    const out: WireDiagram = { ...validated, id };
    const finalPath = this.pathFor(id);
    const tmpPath = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    try {
      await rename(tmpPath, finalPath);
    } catch (err) {
      await rm(tmpPath, { force: true });
      throw err;
    }
    return out;
  }
}

export class MemoryStorage implements StorageBackend {
  private readonly diagrams = new Map<string, { diagram: WireDiagram; updatedAt: string }>();
  private readonly mutex = makeKeyedMutex();

  pathFor(): undefined {
    return undefined;
  }

  async exists(id: string): Promise<boolean> {
    assertSafeId(id);
    return this.diagrams.has(id);
  }

  async list(): Promise<DiagramSummary[]> {
    const out: DiagramSummary[] = [];
    for (const [id, { diagram, updatedAt }] of this.diagrams) {
      const summary: DiagramSummary = {
        id,
        nodes: diagram.nodes.length,
        layout: diagram.layout,
        updatedAt
      };
      if (diagram.title !== undefined) summary.title = diagram.title;
      out.push(summary);
    }
    out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return out;
  }

  async load(id: string): Promise<WireDiagram> {
    return this.mutex.run(id, () => this.loadUnlocked(id));
  }

  async save(id: string, diagram: WireDiagram): Promise<WireDiagram> {
    return this.mutex.run(id, () => this.saveUnlocked(id, diagram));
  }

  async mutate(
    id: string,
    mutator: (diagram: WireDiagram) => Promise<WireDiagram> | WireDiagram
  ): Promise<WireDiagram> {
    return this.mutex.run(id, async () => {
      const current = await this.loadUnlocked(id);
      const next = await mutator(current);
      return this.saveUnlocked(id, next);
    });
  }

  async remove(id: string): Promise<void> {
    return this.mutex.run(id, async () => {
      assertSafeId(id);
      this.diagrams.delete(id);
    });
  }

  private async loadUnlocked(id: string): Promise<WireDiagram> {
    assertSafeId(id);
    const entry = this.diagrams.get(id);
    if (!entry) throw new Error(`Diagram "${id}" not found.`);
    return entry.diagram;
  }

  private async saveUnlocked(id: string, diagram: WireDiagram): Promise<WireDiagram> {
    assertSafeId(id);
    const validated = parseWireDiagram(diagram);
    const out: WireDiagram = { ...validated, id };
    this.diagrams.set(id, { diagram: out, updatedAt: new Date().toISOString() });
    return out;
  }
}

export function createDefaultDiagram(opts: {
  id: string;
  title?: string;
  layout?: WireDiagram["layout"];
}): WireDiagram {
  const init: { id: string; title?: string; layout?: WireDiagram["layout"] } = { id: opts.id };
  if (opts.title !== undefined) init.title = opts.title;
  if (opts.layout !== undefined) init.layout = opts.layout;
  return emptyDiagram(init);
}
