import type { Book } from "./openbd";

// Calls go through our own backend (api/books.ts) instead of Rakuten
// directly — credentials stay server-side, and the backend caches popular
// queries so many concurrent visitors don't each burn through the shared
// 1 req/sec quota Rakuten granted this app.
const SEARCH_ENDPOINT = "/api/books";

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

// Rakuten's "large" image is only served at 200x200 by default — far too
// blurry stretched across a full phone screen. The same thumbnail endpoint
// accepts a bigger _ex=WxH, which serves close to the original resolution.
function upscaleCover(url: string): string {
  return url.replace(/_ex=\d+x\d+/, "_ex=800x800");
}

function mapItem(item: RakutenItem): Book {
  return {
    isbn: item.isbn,
    title: item.title,
    author: item.author,
    publisher: item.publisherName,
    cover: upscaleCover(item.largeImageUrl),
    synopsis: item.itemCaption,
    purchaseUrl: item.itemUrl,
  };
}

async function search(params: Record<string, string>): Promise<Book[]> {
  const url = new URL(SEARCH_ENDPOINT, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Books API request failed: ${res.status}`);
  }
  const data: RakutenResponse = await res.json();
  // Require a real cover and a substantive synopsis — listings without one
  // are often goods/magazines/bundled extras rather than an actual book,
  // and show up in the feed as an awkward "あらすじは準備中です" dead end.
  return data.Items.filter(
    (i) => i.Item.largeImageUrl && i.Item.title && i.Item.itemCaption?.trim().length >= 10,
  ).map((i) => mapItem(i.Item));
}

/** Best-selling books overall, or within a Rakuten Books genre. */
export function fetchTrendingBooks(
  booksGenreId = "001",
  hits = 30,
  page = 1,
): Promise<Book[]> {
  return search({
    booksGenreId,
    sort: "sales",
    hits: String(hits),
    page: String(page),
    outOfStockFlag: "0",
  });
}

/** Keyword search, used to browse a specific mood/genre in the feed. */
export function fetchBooksByKeyword(
  keyword: string,
  hits = 30,
  page = 1,
): Promise<Book[]> {
  return search({
    keyword,
    hits: String(hits),
    page: String(page),
    outOfStockFlag: "0",
  });
}
