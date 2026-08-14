import { useEffect, useRef, useState } from "react";
import { seedBooks } from "../data/seedBooks";
import { fetchBooks, type Book } from "../lib/openbd";
import { fetchTrendingBooks } from "../lib/rakuten";
import { GENRE_IDS, GENRE_TAB_LIST, recordSignal, throttle } from "../lib/recommendation";

interface OnboardingProps {
  onComplete: () => void;
}

interface Candidate {
  book: Book;
  genre: string;
}

const PICKS_PER_GENRE = 2;

// Two picks per genre from the curated seed set — used only as a fallback
// if Rakuten is unreachable, since it needs no network round trip.
function pickSeedSample(): { isbn: string; genre: string }[] {
  const byGenre = new Map<string, { isbn: string; genre: string }[]>();
  for (const b of seedBooks) {
    const list = byGenre.get(b.genre) ?? [];
    list.push(b);
    byGenre.set(b.genre, list);
  }
  const sample: { isbn: string; genre: string }[] = [];
  for (const list of byGenre.values()) {
    sample.push(...list.slice(0, PICKS_PER_GENRE));
  }
  return sample;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingMore, setLoadingMore] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const candidatesRef = useRef<Candidate[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFromSeed() {
      const sample = pickSeedSample();
      try {
        const books = await fetchBooks(sample.map((s) => s.isbn));
        if (cancelled) return;
        const genreByIsbn = new Map(sample.map((s) => [s.isbn, s.genre]));
        const list = books
          .filter((b) => b.cover)
          .map((book) => ({ book, genre: genreByIsbn.get(book.isbn) ?? "" }));
        setCandidates(list);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    }

    // Pulls real bestsellers from the same source the actual feed uses, so
    // the very first screen doesn't undersell the app with the old niche
    // openBD sampler. Loads progressively (genre by genre) so users can
    // start tapping before every genre has finished loading.
    async function loadFromRakuten() {
      let successCount = 0;
      for (let i = 0; i < GENRE_TAB_LIST.length; i++) {
        if (cancelled) return;
        const genre = GENRE_TAB_LIST[i];
        try {
          await throttle(i === 0);
          const books = await fetchTrendingBooks(GENRE_IDS[genre], PICKS_PER_GENRE);
          if (cancelled) return;
          if (books.length > 0) {
            successCount++;
            const seenIsbns = new Set(candidatesRef.current.map((c) => c.book.isbn));
            const additions = books
              .filter((book) => !seenIsbns.has(book.isbn))
              .map((book) => ({ book, genre }));
            candidatesRef.current = [...candidatesRef.current, ...additions];
            setCandidates(candidatesRef.current);
          }
        } catch {
          // skip this genre, keep going with the rest
        }
      }
      if (!cancelled) {
        setLoadingMore(false);
        if (successCount === 0) await loadFromSeed(); // Rakuten backend unreachable entirely
      }
    }

    loadFromRakuten();
    return () => {
      cancelled = true;
    };
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
    for (const { book, genre } of candidates) {
      if (selected.has(book.isbn)) {
        recordSignal(genre, book.author, "like");
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

      {candidates.length === 0 && loadingMore ? (
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
          {loadingMore && candidates.length > 0 && (
            <div className="col-span-2 flex justify-center py-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-amber-400" />
            </div>
          )}
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
