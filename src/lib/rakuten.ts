import type { Book } from "./openbd";

const APPLICATION_ID = import.meta.env.VITE_RAKUTEN_APPLICATION_ID as
  | string
  | undefined;
const ACCESS_KEY = import.meta.env.VITE_RAKUTEN_ACCESS_KEY as
  | string
  | undefined;

// The Rakuten Books API enforces an origin allowlist that a browser can't
// spoof from localhost, so dev traffic goes through a Vite proxy (see
// vite.config.ts) that attaches the registered placeholder origin. In
// production, the real deployed domain must be added to the "許可された
// ウェブサイト" list in the Rakuten app settings so the browser's genuine
// Origin header satisfies the check directly, with no proxy needed.
const BASE_URL = import.meta.env.DEV
  ? "/rakuten-api"
  : "https://openapi.rakuten.co.jp";

const SEARCH_ENDPOINT = `${BASE_URL}/services/api/BooksTotal/Search/20170404`;

export const isRakutenConfigured = Boolean(APPLICATION_ID && ACCESS_KEY);

interface RakutenItem {
  title: string;
  author: string;
  publisherName: string;
  isbn: string;
  itemCaption: string;
  largeImageUrl: string;
  itemUrl: string;
  booksGenreId: string;
}

interface RakutenResponse {
  Items: { Item: RakutenItem }[];
}

function mapItem(item: RakutenItem): Book {
  return {
    isbn: item.isbn,
    title: item.title,
    author: item.author,
    publisher: item.publisherName,
    cover: item.largeImageUrl,
    synopsis: item.itemCaption,
    purchaseUrl: item.itemUrl,
  };
}

async function search(params: Record<string, string>): Promise<Book[]> {
  if (!APPLICATION_ID || !ACCESS_KEY) {
    throw new Error("Rakuten API is not configured");
  }
  const url = new URL(SEARCH_ENDPOINT, window.location.origin);
  url.searchParams.set("format", "json");
  url.searchParams.set("applicationId", APPLICATION_ID);
  url.searchParams.set("accessKey", ACCESS_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Rakuten Books API request failed: ${res.status}`);
  }
  const data: RakutenResponse = await res.json();
  return data.Items.filter((i) => i.Item.largeImageUrl && i.Item.title).map(
    (i) => mapItem(i.Item),
  );
}

/** Best-selling books overall, or within a Rakuten Books genre. */
export function fetchTrendingBooks(
  booksGenreId = "001",
  hits = 10,
): Promise<Book[]> {
  return search({
    booksGenreId,
    sort: "sales",
    hits: String(hits),
    outOfStockFlag: "0",
  });
}

/** Keyword search, used to browse a specific mood/genre in the feed. */
export function fetchBooksByKeyword(
  keyword: string,
  hits = 10,
): Promise<Book[]> {
  return search({
    keyword,
    hits: String(hits),
    outOfStockFlag: "0",
  });
}
