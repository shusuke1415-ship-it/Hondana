import { seedBooks, type SeedBook } from "../data/seedBooks";

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

export type Signal = "like" | "dislike" | "view";

const SIGNAL_WEIGHT: Record<Signal, number> = {
  like: 3,
  dislike: -2,
  view: 0.3,
};

export type PickKind = "top" | "adjacent" | "random" | "cold-start";

export interface FeedEntry {
  book: SeedBook;
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

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T | undefined {
  const weights = items.map(weightOf).map((w) => Math.max(w, 0.001));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
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
      return "まずはこんな一冊から、書店をめぐってみませんか";
  }
}

export function pickNext(shown: Set<string>): FeedEntry | null {
  const scores = loadScores();
  const genresWithScore = Object.entries(scores).filter(([, s]) => s > 0);
  const topGenre =
    genresWithScore.length > 0
      ? genresWithScore.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : null;

  let pool = seedBooks.filter((b) => !shown.has(b.isbn));
  if (pool.length === 0) {
    // exhausted the catalog — start a new lap
    shown.clear();
    pool = seedBooks;
  }

  let kind: PickKind;
  let candidates: SeedBook[];

  if (!topGenre) {
    kind = "cold-start";
    candidates = pool;
  } else {
    const roll = Math.random();
    if (roll < 0.7) {
      kind = "top";
      const adjacent = new Set(GENRE_ADJACENCY[topGenre] ?? []);
      candidates = pool.filter((b) => b.genre === topGenre || adjacent.has(b.genre));
      if (candidates.length === 0) candidates = pool;
    } else if (roll < 0.9) {
      kind = "adjacent";
      const adjacent = new Set(GENRE_ADJACENCY[topGenre] ?? []);
      candidates = pool.filter((b) => adjacent.has(b.genre));
      if (candidates.length === 0) candidates = pool;
    } else {
      kind = "random";
      candidates = pool;
    }
  }

  const book = weightedPick(candidates, (b) => {
    if (kind !== "top") return 1;
    const adjacent = new Set(GENRE_ADJACENCY[topGenre ?? ""] ?? []);
    if (b.genre === topGenre) return (scores[topGenre] ?? 1) + 2;
    if (adjacent.has(b.genre)) return 1;
    return 0.3;
  });

  if (!book) return null;

  shown.add(book.isbn);
  return {
    book,
    reason: reasonFor(kind, book.genre, topGenre),
    kind,
  };
}
