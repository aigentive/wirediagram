import { get } from "@vercel/blob";

export async function readBlobJson<T>(pathname: string, options: { useCache?: boolean } = {}): Promise<T | null> {
  const result = await get(pathname, {
    access: "public",
    useCache: options.useCache ?? false
  });
  if (!result || result.statusCode !== 200) return null;

  const text = await new Response(result.stream).text();
  if (!text) return null;
  return JSON.parse(text) as T;
}
