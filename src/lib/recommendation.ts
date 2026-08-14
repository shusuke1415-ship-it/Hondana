import { seedBooks } from "../data/seedBooks";
import { fetchBooks, type Book } from "./openbd";
import { fetchTrendingBooks } from "./rakuten";

const GENRE_STORAGE_KEY = "serendipity-genre-scores";
const AUTHOR_STORAGE_KEY = "serendipity-author-scores";

const GENRE_ADJACENCY: Record<string, string[]> = {
  小説: ["ミステリー", "海外文学", "文芸評論"],
  ミステリー: ["小説", "海外文学"],
  海外文学: ["小説", "ミステリー", "文芸評論"],
  文芸評論: ["小説", "海外文学", "思想"],
  エッセイ: ["生き方", "心と体", "紀行", "カルチャー"],
  生き方: ["エッセイ", "心と体", "思想"],
  心と体: ["エッセイ", "生き方"],
  思想: ["生き方", "文芸評論", "カルチャー", "歴史"],
  紀行: ["エッセイ", "カルチャー"],
  カルチャー: ["エッセイ", "思想", "詩"],
  詩: ["カルチャー", "エッセイ"],
  歴史: ["思想", "カルチャー"],
  趣味: ["カルチャー", "生き方"],
};

// Rakuten Books genre IDs for each mood/genre tag, hand-picked to exclude
// categories where age-restricted or sexually explicit content is known to
// be mixed in under normal book listings (manga/青年誌, 写真集・タレント,
// BL/TL). Trusting a keyword search alone let that content straight into
// the "trending" feed — genre-scoped browsing avoids that class of result.
const GENRE_IDS: Record<string, string> = {
  小説: "001004008", // 日本の小説
  ミステリー: "001004001", // ミステリー・サスペンス
  海外文学: "001004009", // 外国の小説
  文芸評論: "001008022", // 文学
  エッセイ: "001004003", // エッセイ
  生き方: "001020002", // 美容・暮らし・健康・料理（新書）
  心と体: "001020002",
  思想: "001008002", // 哲学・思想
  紀行: "001007", // 旅行・留学・アウトドア
  カルチャー: "001009", // ホビー・スポーツ・美術
  詩: "001008022",
  歴史: "001008005", // 歴史
  趣味: "001009",
  // openBD フォールバック(seedBooks.ts)にだけ存在するジャンルタグ。安全な
  // ジャンルへ振っておく — Rakuten側の001013(写真集・タレント)は
  // グラビア系が混ざるため使わない。
  写真集: "001009",
  話題の本: "001004", // 小説・エッセイ全体（コールドスタート表示用）
};

const ALL_GENRES = Object.keys(GENRE_IDS).filter((g) => g !== "話題の本");

export type Signal = "like" | "dislike" | "purchase";

const SIGNAL_WEIGHT: Record<Signal, number> = {
  like: 3,
  dislike: -2,
  purchase: 6,
};

export type PickKind = "top" | "adjacent" | "random" | "cold-start";

export interface FeedEntry {
  book: Book;
  genre: string;
  reason: string;
  kind: PickKind;
}

function loadMap(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(key: string, scores: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(scores));
  } catch {
    // localStorage unavailable (private mode etc.) — silently skip persistence
  }
}

function bump(key: string, name: string, amount: number) {
  if (!name) return;
  const scores = loadMap(key);
  scores[name] = (scores[name] ?? 0) + amount;
  saveMap(key, scores);
}

/** Explicit tap: like/dislike buttons, or a purchase-link click. */
export function recordSignal(genre: string, author: string, signal: Signal) {
  const weight = SIGNAL_WEIGHT[signal];
  bump(GENRE_STORAGE_KEY, genre, weight);
  bump(AUTHOR_STORAGE_KEY, author, weight);
}

/**
 * Implicit, TikTok-style signal from how long a card stayed on screen.
 * Scrolling past in under ~1.5s reads as disinterest; lingering for several
 * seconds reads as genuine interest — same idea as watch-time on a FYP.
 */
export function recordDwell(genre: string, author: string, seconds: number) {
  let weight: number;
  if (seconds < 1.5) weight = -1;
  else if (seconds < 3) weight = 0;
  else if (seconds < 6) weight = 1;
  else weight = 2.5;

  if (weight === 0) return;
  bump(GENRE_STORAGE_KEY, genre, weight);
  bump(AUTHOR_STORAGE_KEY, author, weight);
}

function topGenreFromScores(): string | null {
  const scores = loadMap(GENRE_STORAGE_KEY);
  const withScore = Object.entries(scores).filter(([, s]) => s > 0);
  if (withScore.length === 0) return null;
  return withScore.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function reasonFor(kind: PickKind, genre: string, topGenre: string | null, favoredAuthor: boolean): string {
  if (favoredAuthor) return "よく読んでいる著者の一冊です";
  switch (kind) {
    case "top":
      return `あなたが好きな「${genre}」の一冊です`;
    case "adjacent":
      return topGenre
        ? `「${topGenre}」が好きなあなたに、少し違う「${genre}」の世界もいかがですか`
        : `「${genre}」の棚から、気になる一冊`;
    case "random":
      return "ふらっと立ち寄った棚で見つけた、思いがけない一冊";
    case "cold-start":
      return "今、みんなが読んでいる一冊です";
  }
}

/** Weighted pick that favors books by authors the user has responded well to. */
function pickUnshown(pool: Book[], shown: Set<string>): { book: Book; favoredAuthor: boolean } | undefined {
  const candidates = pool.filter((b) => !shown.has(b.isbn));
  if (candidates.length === 0) return undefined;

  const authorScores = loadMap(AUTHOR_STORAGE_KEY);
  const weights = candidates.map((b) => 1 + Math.max(0, authorScores[b.author] ?? 0) * 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let idx = candidates.length - 1;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      idx = i;
      break;
    }
  }

  const book = candidates[idx];
  const favoredAuthor = (authorScores[book.author] ?? 0) > 2;
  const poolIdx = pool.indexOf(book);
  if (poolIdx >= 0) pool.splice(poolIdx, 1);
  return { book, favoredAuthor };
}

// ---- Rakuten-backed path (real, ~endless catalog + real bestsellers) ----

// The declared QPS for this app is 1 request/second — keep a floor between calls.
let lastCallAt = 0;
async function throttle() {
  const wait = Math.max(0, lastCallAt + 1100 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

// Rakuten allows up to page 100; wrap back to page 1 in the unlikely case a
// single session scrolls a genre that far (recycled results beat a dead end).
const MAX_PAGE = 100;

interface PoolState {
  items: Book[];
  nextPage: number;
}

const genrePools = new Map<string, PoolState>();
const trendingState: PoolState = { items: [], nextPage: 1 };

/** Fetches the next page into the pool; returns how many new items arrived. */
async function refill(state: PoolState, fetcher: (page: number) => Promise<Book[]>): Promise<number> {
  await throttle();
  const items = await fetcher(state.nextPage);
  state.items.push(...items);
  state.nextPage = state.nextPage >= MAX_PAGE ? 1 : state.nextPage + 1;
  return items.length;
}

// Items already picked get spliced out of a pool, but an item can also sit
// unpicked in one pool after being shown via a different pool (trending and
// a genre search often overlap). So "does this pool have a usable candidate"
// has to check against `shown`, not just pool size — otherwise the feed can
// stall on a pool that's technically non-empty but fully seen already.
async function ensurePoolHasCandidate(
  state: PoolState,
  shown: Set<string>,
  fetcher: (page: number) => Promise<Book[]>,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (state.items.some((b) => !shown.has(b.isbn))) return;
    const added = await refill(state, fetcher);
    if (added === 0) return; // this query has no more results to offer
  }
}

async function getGenrePool(genre: string, shown: Set<string>): Promise<Book[]> {
  let state = genrePools.get(genre);
  if (!state) {
    state = { items: [], nextPage: 1 };
    genrePools.set(genre, state);
  }
  const genreId = GENRE_IDS[genre];
  await ensurePoolHasCandidate(state, shown, (page) => fetchTrendingBooks(genreId, 30, page));
  return state.items;
}

async function getTrendingPool(shown: Set<string>): Promise<Book[]> {
  await ensurePoolHasCandidate(trendingState, shown, (page) =>
    fetchTrendingBooks(GENRE_IDS["話題の本"], 30, page),
  );
  return trendingState.items;
}

async function pickNextFromRakuten(shown: Set<string>): Promise<FeedEntry | null> {
  const topGenre = topGenreFromScores();

  let kind: PickKind;
  let genre: string;
  let picked: { book: Book; favoredAuthor: boolean } | undefined;

  if (!topGenre) {
    kind = "cold-start";
    genre = "話題の本";
    picked = pickUnshown(await getTrendingPool(shown), shown);
  } else {
    const roll = Math.random();
    if (roll < 0.7) {
      kind = "top";
      genre = topGenre;
    } else if (roll < 0.9) {
      kind = "adjacent";
      const adjacent = GENRE_ADJACENCY[topGenre] ?? [];
      genre = adjacent.length > 0
        ? adjacent[Math.floor(Math.random() * adjacent.length)]
        : topGenre;
    } else {
      kind = "random";
      genre = ALL_GENRES[Math.floor(Math.random() * ALL_GENRES.length)];
    }
    picked = pickUnshown(await getGenrePool(genre, shown), shown);
    // fall back to trending if this genre's pool is genuinely exhausted
    if (!picked) picked = pickUnshown(await getTrendingPool(shown), shown);
  }

  if (!picked) return null;
  shown.add(picked.book.isbn);
  return {
    book: picked.book,
    genre,
    reason: reasonFor(kind, genre, topGenre, picked.favoredAuthor),
    kind,
  };
}

// ---- Static fallback path (used when Rakuten isn't configured) ----

async function pickNextFromSeed(shown: Set<string>): Promise<FeedEntry | null> {
  const topGenre = topGenreFromScores();
  let pool = seedBooks.filter((b) => !shown.has(b.isbn));
  if (pool.length === 0) {
    shown.clear();
    pool = seedBooks;
  }

  let kind: PickKind;
  let candidates = pool;

  if (!topGenre) {
    kind = "cold-start";
  } else {
    const roll = Math.random();
    const adjacent = new Set(GENRE_ADJACENCY[topGenre] ?? []);
    if (roll < 0.7) {
      kind = "top";
      candidates = pool.filter((b) => b.genre === topGenre || adjacent.has(b.genre));
      if (candidates.length === 0) candidates = pool;
    } else if (roll < 0.9) {
      kind = "adjacent";
      candidates = pool.filter((b) => adjacent.has(b.genre));
      if (candidates.length === 0) candidates = pool;
    } else {
      kind = "random";
    }
  }

  const seedPicked = candidates[Math.floor(Math.random() * candidates.length)];
  if (!seedPicked) return null;
  shown.add(seedPicked.isbn);

  const [book] = await fetchBooks([seedPicked.isbn]);
  if (!book) return null;
  const authorScores = loadMap(AUTHOR_STORAGE_KEY);
  const favoredAuthor = (authorScores[book.author] ?? 0) > 2;
  return {
    book,
    genre: seedPicked.genre,
    reason: reasonFor(kind, seedPicked.genre, topGenre, favoredAuthor),
    kind,
  };
}

// If our own backend (api/books.ts) isn't reachable — e.g. running `npm run
// dev` without `vercel dev`, or a genuine outage — fall back to the static
// openBD-backed feed for the rest of the session rather than retrying a
// failing network call on every single pick.
let rakutenBackendDown = false;

export async function pickNext(shown: Set<string>): Promise<FeedEntry | null> {
  if (!rakutenBackendDown) {
    try {
      return await pickNextFromRakuten(shown);
    } catch {
      rakutenBackendDown = true;
    }
  }
  return pickNextFromSeed(shown);
}
