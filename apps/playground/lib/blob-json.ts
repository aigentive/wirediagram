import { get, list } from "@vercel/blob";

export async function readBlobJson<T>(
  pathname: string,
  options: { useCache?: boolean; bustCache?: boolean } = {}
): Promise<T | null> {
  const found = await findBlobEntry(pathname);
  if (!found) return null;

  const result = await readBlobUrl(found.url, options.useCache ?? false, {
    bustCache: options.bustCache ?? false,
    version: found.uploadedAt
  });
  if (!result || result.statusCode !== 200) return null;

  const text = await new Response(result.stream).text();
  if (!text) return null;
  return JSON.parse(text) as T;
}

async function findBlobEntry(pathname: string): Promise<{ url: string; uploadedAt: string | null } | null> {
  const result = await list({ prefix: pathname, limit: 1000 });
  const blob = result.blobs.find((entry) => entry.pathname === pathname);
  if (!blob) return null;
  const uploadedAt = blob.uploadedAt instanceof Date
    ? blob.uploadedAt.toISOString()
    : typeof blob.uploadedAt === "string"
      ? blob.uploadedAt
      : null;
  return { url: blob.url, uploadedAt };
}

async function readBlobUrl(
  url: string,
  useCache: boolean,
  options: { bustCache: boolean; version: string | null }
): Promise<{ statusCode: 200; stream: ReadableStream<Uint8Array> } | null> {
  const fetchUrl = options.bustCache
    ? appendQuery(url, "_v", options.version ?? String(Date.now()))
    : url;
  const publicRes = await fetch(fetchUrl, { cache: useCache ? "force-cache" : "no-store" });
  if (publicRes.status === 404) return null;
  if (publicRes.ok && publicRes.body) {
    return { statusCode: 200, stream: publicRes.body };
  }

  const authed = await get(url, {
    access: "public",
    useCache
  });
  if (!authed || authed.statusCode !== 200) return null;
  return { statusCode: 200, stream: authed.stream };
}

function appendQuery(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
