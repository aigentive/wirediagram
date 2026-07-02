import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CurrentUser } from "./current-user";
import { createUserWireFromDiagram } from "./wires-store";
import {
  createWireShareLinks,
  listWireShareLinks,
  resolvePublicShare,
  revokeWireShareLink,
  saveEditableShare,
  ShareRateLimitError
} from "./share-links-store";

const originalBackend = process.env.WIRE_CLOUD_BACKEND;
const originalCloudDir = process.env.WIRE_CLOUD_DIR;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalTursoUrl = process.env.TURSO_DATABASE_URL;
const originalEditLimit = process.env.WIRE_EDIT_SHARE_WRITE_LIMIT;

const user: CurrentUser = {
  key: "user_12345678901234567890",
  email: "user@example.com",
  name: null,
  image: null
};

afterEach(() => {
  setEnv("WIRE_CLOUD_BACKEND", originalBackend);
  setEnv("WIRE_CLOUD_DIR", originalCloudDir);
  setEnv("BLOB_READ_WRITE_TOKEN", originalBlobToken);
  setEnv("TURSO_DATABASE_URL", originalTursoUrl);
  setEnv("WIRE_EDIT_SHARE_WRITE_LIMIT", originalEditLimit);
});

describe("share links", () => {
  it("expires and revokes public share tokens", async () => {
    const root = useFilesystemCloud();
    try {
      const { wire } = await createWire();
      const expired = await createWireShareLinks({
        user,
        wire,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      });
      expect(await resolvePublicShare(expired.view.token, "view")).toBeNull();

      const active = await createWireShareLinks({ user, wire, scope: "edit" });
      expect(await resolvePublicShare(active.view.token, "view")).toBeTruthy();
      expect(await listWireShareLinks(user, wire.id)).toHaveLength(3);

      const revoked = await revokeWireShareLink(user, active.view.token, { wireId: wire.id });
      expect(revoked.revokedAt).toEqual(expect.any(String));
      expect(await resolvePublicShare(active.view.token, "view")).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rate limits public edit share writes", async () => {
    const root = useFilesystemCloud();
    setEnv("WIRE_EDIT_SHARE_WRITE_LIMIT", "1");
    try {
      const { wire, diagram } = await createWire();
      const links = await createWireShareLinks({ user, wire, scope: "edit" });
      const token = links.edit!.token;

      await saveEditableShare(token, diagram);
      await expect(saveEditableShare(token, diagram)).rejects.toBeInstanceOf(ShareRateLimitError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

async function createWire() {
  return createUserWireFromDiagram(user, {
    version: 1,
    id: "share-test",
    title: "Share Test",
    layout: "LR",
    nodes: [{ id: "start", kind: "trigger", title: "Start" }],
    edges: []
  }, { wireId: "share-test" });
}

function useFilesystemCloud(): string {
  const root = mkdtempSync(join(tmpdir(), "wire-share-test-"));
  setEnv("WIRE_CLOUD_BACKEND", "filesystem");
  setEnv("WIRE_CLOUD_DIR", root);
  setEnv("BLOB_READ_WRITE_TOKEN", undefined);
  setEnv("TURSO_DATABASE_URL", undefined);
  return root;
}

function setEnv(
  key:
    | "WIRE_CLOUD_BACKEND"
    | "WIRE_CLOUD_DIR"
    | "BLOB_READ_WRITE_TOKEN"
    | "TURSO_DATABASE_URL"
    | "WIRE_EDIT_SHARE_WRITE_LIMIT",
  value: string | undefined
): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
  } else {
    Reflect.set(process.env, key, value);
  }
}
