import { seedBooks } from "../data/seedBooks";
import { fetchBooks, type Book } from "./openbd";
import {
  fetchBooksByKeyword,
  fetchTrendingBooks,
  isRakutenConfigured,
} from "./rakuten";

const STORAGE_KEY = "serendipity-genre-scores";

const GENRE_ADJACENCY: Record<string, string[]> = {
  小説: ["ミステリー", "海外文学", "文芸評論"],
  ミステリー: ["小説", "海外文学"],
  海外文学: ["小説", "ミステリー", "文芸評論"],
  文芸評論: ["小説", "海外文学", "思想"],
  エッセイ: ["生き方", "心と体", "紀行", "カルチャー"],
  生き方: ["エッセイ", "心と体", "思想"],
  心と体: ["エッセイ", "生き方"],
  思想: ["生き方", "文芸評論", "カルチャー", "歴史"],
  紀行: ["エッセイ", "写真集"],
  写真集: ["紀行", "カルチャー"],
  カルチャー: ["エッセイ", "思想", "写真集", "詩"],
  詩: ["カルチャー", "エッセイ"],
  歴史: ["思想", "カルチャー"],
  趣味: ["カルチャー", "生き方"],
};

// Search keyword to use against Rakuten Books for each mood/genre tag.
const GENRE_KEYWORDS: Record<string, string> = {
  小説: "小説",
  ミステリー: "ミステリー小説",
  海外文学: "海外文学",
  文芸評論: "文芸評論",
  エッセイ: "エッセイ",
  生き方: "生き方",
  心と体: "からだ こころ",
  思想: "哲学 思想",
  紀行: "紀行 旅エッセイ",
  写真集: "写真集",
  カルチャー: "カルチャー 評論",
  詩: "詩集",
  歴史: "歴史 新書",
  趣味: "趣味 入門",
};

const ALL_GENRES = Object.keys(GENRE_KEYWORDS);

export type Signal = "like" | "dislike" | "view";

const SIGNAL_WEIGHT: Record<Signal, number> = {
  like: 3,
  dislike: -2,
  view: 0.3,
};

export type PickKind = "top" | "adjacent" | "random" | "cold-start";

export interface FeedEntry {
  book: Book;
  genre: string;
  reason: string;
  kind: PickKind;
}

function loadScores(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScores(scores: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // localStorage unavailable (private mode etc.) — silently skip persistence
  }
}

export function recordSignal(genre: string, signal: Signal) {
  const scores = loadScores();
  scores[genre] = (scores[genre] ?? 0) + SIGNAL_WEIGHT[signal];
  saveScores(scores);
}

function topGenreFromScores(): string | null {
  const scores = loadScores();
  const withScore = Object.entries(scores).filter(([, s]) => s > 0);
  if (withScore.length === 0) return null;
  return withScore.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function reasonFor(kind: PickKind, genre: string, topGenre: string | null): string {
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

function popRandomUnshown(pool: Book[], shown: Set<string>): Book | undefined {
  const candidates = pool.filter((b) => !shown.has(b.isbn));
  if (candidates.length === 0) return undefined;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const idx = pool.indexOf(picked);
  if (idx >= 0) pool.splice(idx, 1);
  return picked;
}

// ---- Rakuten-backed path (real, ~endless catalog + real bestsellers) ----

// The declared QPS for this app is 1 request/second — keep a floor between calls.
let lastCallAt = 0;
async function throttle() {
  const wait = Math.max(0, lastCallAt + 1100 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

const genrePools = new Map<string, Book[]>();
let trendingPool: Book[] = [];
let trendingPage = 1;

async function getGenrePool(genre: string): Promise<Book[]> {
  const cached = genrePools.get(genre);
  if (cached && cached.length > 0) return cached;
  await throttle();
  const keyword = GENRE_KEYWORDS[genre] ?? genre;
  const items = await fetchBooksByKeyword(keyword, 10);
  genrePools.set(genre, items);
  return items;
}

async function getTrendingPool(): Promise<Book[]> {
  if (trendingPool.length > 0) return trendingPool;
  await throttle();
  trendingPool = await fetchTrendingBooks(undefined, 10);
  trendingPage += 1;
  return trendingPool;
}

async function pickNextFromRakuten(shown: Set<string>): Promise<FeedEntry | null> {
  const topGenre = topGenreFromScores();

  let kind: PickKind;
  let genre: string;
  let book: Book | undefined;

  if (!topGenre) {
    kind = "cold-start";
    genre = "話題の本";
    book = popRandomUnshown(await getTrendingPool(), shown);
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
    book = popRandomUnshown(await getGenrePool(genre), shown);
    // fall back to trending if this genre's pool is temporarily exhausted
    if (!book) book = popRandomUnshown(await getTrendingPool(), shown);
  }

  if (!book) return null;
  shown.add(book.isbn);
  return { book, genre, reason: reasonFor(kind, genre, topGenre), kind };
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

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  if (!picked) return null;
  shown.add(picked.isbn);

  const [book] = await fetchBooks([picked.isbn]);
  if (!book) return null;
  return { book, genre: picked.genre, reason: reasonFor(kind, picked.genre, topGenre), kind };
}

export function pickNext(shown: Set<string>): Promise<FeedEntry | null> {
  return isRakutenConfigured ? pickNextFromRakuten(shown) : pickNextFromSeed(shown);
}
