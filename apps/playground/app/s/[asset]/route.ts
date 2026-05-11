import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";
import { renderToSvg, toMermaid } from "@aigentive/wire-core";
import { resolvePublicShare, shareUrls } from "@/lib/share-links-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RASTER_FONT_FILE = join(
  process.cwd(),
  "../../node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"
);

type RouteContext = {
  params: Promise<{ asset: string }>;
};

type AssetKind = "html" | "svg" | "png" | "json" | "mmd";

export async function GET(req: Request, context: RouteContext): Promise<Response> {
  const { asset } = await context.params;
  const parsed = parseAsset(asset);
  if (!parsed) return new Response("Not found", { status: 404 });

  const share = await resolvePublicShare(parsed.token, "view");
  if (!share) return new Response("Not found", { status: 404 });

  const title = share.diagram.title ?? share.diagram.id ?? "Wire share";
  const svg = renderToSvg(share.diagram);
  const headers = cacheHeaders(Boolean(share.record?.pinned || share.legacyToken));

  if (parsed.kind === "svg") {
    return new Response(svg, {
      status: 200,
      headers: {
        ...headers,
        "content-type": "image/svg+xml; charset=utf-8"
      }
    });
  }

  if (parsed.kind === "png") {
    const png = await renderPng(svg, widthFromUrl(req.url));
    return new Response(Buffer.from(png), {
      status: 200,
      headers: {
        ...headers,
        "content-type": "image/png"
      }
    });
  }

  if (parsed.kind === "json") {
    return Response.json(share.diagram, {
      status: 200,
      headers
    });
  }

  if (parsed.kind === "mmd") {
    return new Response(toMermaid(share.diagram), {
      status: 200,
      headers: {
        ...headers,
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }

  const origin = new URL(req.url).origin;
  const viewToken = share.record?.viewToken ?? share.record?.token ?? share.legacyToken ?? parsed.token;
  const urls = shareUrls(origin, {
    viewToken,
    editToken: share.record?.scope === "edit" ? share.record.token : null,
    wireId: share.record?.wireId ?? null
  });
  return new Response(publicShareHtml({ title, svg, token: viewToken, urls }), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300"
    }
  });
}

function parseAsset(asset: string): { token: string; kind: AssetKind } | null {
  const match = asset.match(/^([A-Za-z0-9_-]{8,96})(?:\.(svg|png|json|mmd))?$/);
  if (!match) return null;
  return {
    token: match[1]!,
    kind: (match[2] as AssetKind | undefined) ?? "html"
  };
}

function cacheHeaders(immutable: boolean): Record<string, string> {
  return immutable
    ? { "cache-control": "public, max-age=31536000, immutable" }
    : { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" };
}

function widthFromUrl(url: string): number | undefined {
  const raw = new URL(url).searchParams.get("w");
  if (!raw) return undefined;
  const width = Number(raw);
  if (!Number.isFinite(width)) return undefined;
  return Math.max(320, Math.min(4096, Math.round(width)));
}

async function renderPng(svg: string, width?: number): Promise<Uint8Array> {
  const resvg = new Resvg(normalizeSvgForPng(svg), {
    ...(width ? { fitTo: { mode: "width" as const, value: width } } : {}),
    font: {
      fontFiles: [RASTER_FONT_FILE],
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans",
      sansSerifFamily: "Noto Sans"
    },
    textRendering: 1
  });
  return resvg.render().asPng();
}

function normalizeSvgForPng(svg: string): string {
  return svg
    .replace(/font-family="[^"]*"/, 'font-family="Noto Sans, sans-serif"')
    .replaceAll("▶ ", "")
    .replaceAll("⊕ ", "")
    .replaceAll("→ ", "")
    .replaceAll("◉ ", "")
    .replaceAll("■ ", "");
}

function publicShareHtml({
  title,
  svg,
  token,
  urls
}: {
  title: string;
  svg: string;
  token: string;
  urls: ReturnType<typeof shareUrls>;
}): string {
  const safeTitle = escapeHtml(title);
  const markdown = `![${title}](${urls.svg})`;
  const html = `<img src="${urls.svg}" alt="${escapeAttribute(title)}" />`;
  const editHref = urls.edit ?? `/edit/inline?d=${encodeURIComponent(token)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} - Wire Share</title>
  <meta name="robots" content="noindex" />
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; min-height: 54px; padding: 0 16px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
    .brand { font-weight: 700; color: #020617; text-decoration: none; }
    .title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
    .actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    a.button { display: inline-flex; height: 34px; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; color: #0f172a; text-decoration: none; font-size: 12px; font-weight: 700; background: #fff; }
    main { height: calc(100dvh - 55px); display: grid; grid-template-rows: minmax(0, 1fr) auto; }
    .canvas { min-height: 0; margin: 16px; display: grid; place-items: center; overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
    .canvas svg { max-width: calc(100vw - 64px); max-height: calc(100dvh - 160px); width: auto; height: auto; }
    footer { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 700; color: #64748b; }
    code { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; color: #0f172a; background: #f8fafc; }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">Wire Diagram</a>
    <span>/</span>
    <span class="title">${safeTitle}</span>
    <div class="actions">
      <a class="button" href="${editHref}">Edit</a>
      <a class="button" href="/wires/import?from=${encodeURIComponent(token)}">Open in my workspace</a>
      <a class="button" href="${urls.svg}">SVG</a>
      <a class="button" href="${urls.png}">PNG</a>
      <a class="button" href="${urls.json}">JSON</a>
    </div>
  </header>
  <main>
    <section class="canvas">${svg}</section>
    <footer>
      <span>Powered by Wire Cloud</span>
      <code>${escapeHtml(markdown)}</code>
      <code>${escapeHtml(html)}</code>
    </footer>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
