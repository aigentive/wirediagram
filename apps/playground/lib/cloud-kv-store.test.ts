import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { writeCloudText } from "./cloud-kv-store";

const originalBackend = process.env.WIRE_CLOUD_BACKEND;
const originalCloudDir = process.env.WIRE_CLOUD_DIR;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalTursoUrl = process.env.TURSO_DATABASE_URL;

afterEach(() => {
  setEnv("WIRE_CLOUD_BACKEND", originalBackend);
  setEnv("WIRE_CLOUD_DIR", originalCloudDir);
  setEnv("BLOB_READ_WRITE_TOKEN", originalBlobToken);
  setEnv("TURSO_DATABASE_URL", originalTursoUrl);
});

describe("cloud filesystem storage", () => {
  it("rejects paths that resolve outside the configured root", async () => {
    const root = mkdtempSync(join(tmpdir(), "wire-cloud-root-"));
    const sibling = join(dirname(root), `${basename(root)}-evil`);
    setEnv("WIRE_CLOUD_BACKEND", "filesystem");
    setEnv("WIRE_CLOUD_DIR", root);
    setEnv("BLOB_READ_WRITE_TOKEN", undefined);
    setEnv("TURSO_DATABASE_URL", undefined);

    try {
      await expect(writeCloudText(`../${basename(root)}-evil/x.json`, "{}")).rejects.toThrow(
        "Invalid cloud storage path."
      );
      expect(existsSync(sibling)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(sibling, { recursive: true, force: true });
    }
  });
});

function setEnv(
  key: "WIRE_CLOUD_BACKEND" | "WIRE_CLOUD_DIR" | "BLOB_READ_WRITE_TOKEN" | "TURSO_DATABASE_URL",
  value: string | undefined
): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
  } else {
    Reflect.set(process.env, key, value);
  }
}
