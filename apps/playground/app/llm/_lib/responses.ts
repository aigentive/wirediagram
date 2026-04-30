import { WIRE_DOCS_MANIFEST } from "@aigentive/wire-mcp/dist/docs-shape.js";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";
type DocsRoute = (typeof WIRE_DOCS_MANIFEST.routes)[number];
type PublicDocsManifest = Omit<typeof WIRE_DOCS_MANIFEST, "routes"> & {
  absolute: {
    wellKnown: string;
    llmDocs: string;
    agentGuide: string;
    schema: string;
  };
  routes: Array<DocsRoute & { url: string }>;
};

export function docsJson(data: unknown, status = 200): Response {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_CONTROL
    }
  });
}

export function docsSchemaJson(data: unknown): Response {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status: 200,
    headers: {
      "content-type": "application/schema+json; charset=utf-8",
      "cache-control": CACHE_CONTROL
    }
  });
}

export function docsText(text: string, contentType: string): Response {
  return new Response(text.endsWith("\n") ? text : `${text}\n`, {
    status: 200,
    headers: {
      "content-type": `${contentType}; charset=utf-8`,
      "cache-control": CACHE_CONTROL
    }
  });
}

export function docsNotFound(message: string): Response {
  return docsJson({ error: message }, 404);
}

export function publicDocsManifest(origin: string): PublicDocsManifest {
  const base = origin.replace(/\/$/, "");
  return {
    ...WIRE_DOCS_MANIFEST,
    absolute: {
      wellKnown: `${base}${WIRE_DOCS_MANIFEST.discovery.wellKnown}`,
      llmDocs: `${base}${WIRE_DOCS_MANIFEST.discovery.llmDocs}`,
      agentGuide: `${base}${WIRE_DOCS_MANIFEST.discovery.agentGuide}`,
      schema: `${base}${WIRE_DOCS_MANIFEST.discovery.schema}`
    },
    routes: WIRE_DOCS_MANIFEST.routes.map((route) => ({
      ...route,
      url: `${base}${route.path}`
    }))
  };
}
