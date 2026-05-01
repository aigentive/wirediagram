import { get, list } from "@vercel/blob";

export async function readBlobJson<T>(pathname: string, options: { useCache?: boolean } = {}): Promise<T | null> {
  const url = await findBlobUrl(pathname);
  if (!url) return null;

  const result = await readBlobUrl(url, options.useCache ?? false);
  if (!result || result.statusCode !== 200) return null;

  const text = await new Response(result.stream).text();
  if (!text) return null;
  return JSON.parse(text) as T;
}

async function findBlobUrl(pathname: string): Promise<string | null> {
  const result = await list({ prefix: pathname, limit: 1000 });
  return result.blobs.find((blob) => blob.pathname === pathname)?.url ?? null;
}

async function readBlobUrl(
  url: string,
  useCache: boolean
): Promise<{ statusCode: 200; stream: ReadableStream<Uint8Array> } | null> {
  const publicRes = await fetch(url, { cache: useCache ? "force-cache" : "no-store" });
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
