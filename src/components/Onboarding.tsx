import { useEffect, useState } from "react";
import { seedBooks } from "../data/seedBooks";
import { fetchBooks, type Book } from "../lib/openbd";
import { recordSignal } from "../lib/recommendation";

interface OnboardingProps {
  onComplete: () => void;
}

interface Candidate {
  book: Book;
  genre: string;
}

// Two picks per genre from the curated seed set gives a broad taste sampler
// without needing a slow multi-genre Rakuten fetch just to bootstrap this
// one-time screen.
function pickSample(): { isbn: string; genre: string }[] {
  const byGenre = new Map<string, { isbn: string; genre: string }[]>();
  for (const b of seedBooks) {
    const list = byGenre.get(b.genre) ?? [];
    list.push(b);
    byGenre.set(b.genre, list);
  }
  const sample: { isbn: string; genre: string }[] = [];
  for (const list of byGenre.values()) {
    sample.push(...list.slice(0, 2));
  }
  return sample;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sample = pickSample();
    fetchBooks(sample.map((s) => s.isbn))
      .then((books) => {
        const genreByIsbn = new Map(sample.map((s) => [s.isbn, s.genre]));
        const list = books
          .filter((b) => b.cover)
          .map((book) => ({ book, genre: genreByIsbn.get(book.isbn) ?? "" }));
        setCandidates(list);
      })
      .catch(() => setCandidates([]));
  }, []);

  function toggle(isbn: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(isbn)) next.delete(isbn);
      else next.add(isbn);
      return next;
    });
  }

  function handleStart() {
    if (candidates) {
      for (const { book, genre } of candidates) {
        if (selected.has(book.isbn)) {
          recordSignal(genre, book.author, "like");
        }
      }
    }
    try {
      localStorage.setItem("serendipity-onboarded", "true");
    } catch {
      // localStorage unavailable — proceed anyway, just re-asks next visit
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-30 flex h-dvh flex-col bg-neutral-950">
      <div className="px-6 pb-3 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-center">
        <h1 className="text-lg font-bold text-white">気になる本をタップしてください</h1>
        <p className="mt-1 text-sm text-neutral-400">
          選んだ本の傾向から、あなた好みの一冊をおすすめします
        </p>
      </div>

      {candidates === null ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-amber-400" />
        </div>
      ) : (
        <div className="grid flex-1 auto-rows-max grid-cols-2 content-start gap-3 overflow-y-auto px-4 pb-4">
          {candidates.map(({ book }) => {
            const isSelected = selected.has(book.isbn);
            return (
              <button
                key={book.isbn}
                type="button"
                onClick={() => toggle(book.isbn)}
                className={`overflow-hidden rounded-lg bg-neutral-900 text-left transition ${
                  isSelected ? "ring-4 ring-amber-400" : ""
                }`}
              >
                <div className="relative aspect-[3/4] w-full">
                  <img
                    src={book.cover}
                    alt={book.title}
                    draggable={false}
                    className={`h-full w-full object-cover transition ${isSelected ? "" : "opacity-80"}`}
                  />
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-base font-bold text-white">
                      ✓
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 px-2 py-1.5 text-xs font-semibold text-white">
                  {book.title}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2">
        <button
          type="button"
          onClick={handleStart}
          className="w-full rounded-full bg-amber-500 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          {selected.size > 0 ? `はじめる（${selected.size}冊選択中）` : "スキップしてはじめる"}
        </button>
      </div>
    </div>
  );
}
