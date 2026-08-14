import type { Book } from "./openbd";

const STORAGE_KEY = "serendipity-favorites";

export interface FavoriteEntry {
  book: Book;
  genre: string;
  likedAt: number;
}

function load(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(favorites: FavoriteEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage unavailable (private mode etc.) — silently skip persistence
  }
}

export function getFavorites(): FavoriteEntry[] {
  return load();
}

export function addFavorite(book: Book, genre: string) {
  const favorites = load();
  if (favorites.some((f) => f.book.isbn === book.isbn)) return;
  favorites.unshift({ book, genre, likedAt: Date.now() });
  save(favorites);
}

export function removeFavorite(isbn: string) {
  save(load().filter((f) => f.book.isbn !== isbn));
}
