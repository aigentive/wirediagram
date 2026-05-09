/**
 * ID generation. Wire IDs are short, slug-cased, deterministic where possible,
 * and unique within a diagram.
 */

const SLUG_CLEANUP = /[^a-z0-9]+/g;
const TRIM_DASHES = /^-+|-+$/g;
const MAX_BASE_LEN = 60;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(SLUG_CLEANUP, "-")
    .replace(TRIM_DASHES, "")
    .slice(0, MAX_BASE_LEN);
}

/**
 * Generate a unique ID for a node, using `title` as the slug seed and
 * appending a numeric suffix if the slug already exists in `taken`.
 *
 * Always returns a non-empty value; falls back to `kind` then `node` if the
 * title slugifies to nothing.
 */
export function generateNodeId(opts: {
  title?: string;
  kind?: string;
  taken: ReadonlySet<string>;
  preferredId?: string;
}): string {
  const { taken, preferredId } = opts;

  if (preferredId) {
    if (taken.has(preferredId)) {
      // The caller asked for a specific id but it collides. Fail loudly so
      // we don't silently rename and produce surprising graphs.
      throw new Error(`Node id "${preferredId}" is already taken in this diagram.`);
    }
    return preferredId;
  }

  const seed = slugify(opts.title ?? "") || slugify(opts.kind ?? "") || "node";
  if (!taken.has(seed)) {
    return seed;
  }

  for (let i = 2; i < 1_000; i += 1) {
    const candidate = `${seed}-${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  // Extreme fallback. Practically unreachable.
  return `${seed}-${Date.now()}`;
}
