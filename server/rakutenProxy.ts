// Shared proxy logic used by both the Vercel serverless function
// (api/books.ts, production) and the Vite dev-server middleware
// (vite.config.ts, local development) — so `npm run dev` alone exercises
// the same backend behavior as production, no `vercel dev` required.

const SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/services/api/BooksTotal/Search/20170404";

// The declared quota with Rakuten is 1 request/second for this app, shared
// across every visitor. Caching identical queries for a few minutes means
// many concurrent users browsing the same genre/trending pool are served
// from one upstream call instead of each spending a slot of that quota.
// This is in-memory per process — good enough to absorb bursts; swap for
// Vercel KV/Redis if traffic outgrows a single serverless instance's cache.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

const ALLOWED_PARAMS = [
  "keyword",
  "booksGenreId",
  "sort",
  "hits",
  "page",
  "outOfStockFlag",
] as const;

export interface ProxyResult {
  status: number;
  body: unknown;
}

export async function handleBooksRequest(
  rawQuery: Record<string, string | string[] | undefined>,
): Promise<ProxyResult> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const allowedOrigin = process.env.RAKUTEN_ALLOWED_ORIGIN;

  if (!applicationId || !accessKey || !allowedOrigin) {
    return { status: 500, body: { error: "server_not_configured" } };
  }

  const query: Record<string, string> = {};
  for (const key of ALLOWED_PARAMS) {
    const value = rawQuery[key];
    if (typeof value === "string") query[key] = value;
  }
  if (!query.keyword && !query.booksGenreId) {
    return { status: 400, body: { error: "missing_keyword_or_genre" } };
  }

  const cacheKey = JSON.stringify(query);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { status: 200, body: cached.data };
  }

  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("format", "json");
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("accessKey", accessKey);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        Origin: allowedOrigin,
        Referer: `${allowedOrigin}/`,
      },
    });
  } catch {
    return { status: 502, body: { error: "upstream_unreachable" } };
  }

  if (!upstream.ok) {
    return { status: 502, body: { error: "upstream_error", status: upstream.status } };
  }

  const data = await upstream.json();
  cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
  return { status: 200, body: data };
}
