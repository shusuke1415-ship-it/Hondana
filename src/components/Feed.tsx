import { useEffect, useRef, useState } from "react";
import {
  pickNext,
  pickNextForGenre,
  recordDwell,
  recordSignal,
  selectGenre,
  type FeedEntry,
} from "../lib/recommendation";
import { addFavorite, getFavorites } from "../lib/favorites";
import { FeedCard } from "./FeedCard";
import { FavoritesPage } from "./FavoritesPage";
import { GenreTabs } from "./GenreTabs";

const BATCH_SIZE = 5;

export function Feed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(() => getFavorites().length);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const selectedGenreRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function appendBatch() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next: FeedEntry[] = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const genre = selectedGenreRef.current;
        const entry = genre
          ? await pickNextForGenre(genre, shownRef.current)
          : await pickNext(shownRef.current);
        if (entry) next.push(entry);
      }
      if (next.length > 0) {
        setEntries((prev) => [...prev, ...next]);
      }
    } catch {
      setError("本の情報を取得できませんでした。時間をおいて再度お試しください。");
    } finally {
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    appendBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The sentinel only exists once the loading placeholder gives way to the
    // real feed markup, so this effect must re-run once entries first land —
    // an empty dependency array would fire before the ref is ever attached.
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting) appendBatch();
      },
      { rootMargin: "200% 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length > 0]);

  function handleLike(entry: FeedEntry) {
    recordSignal(entry.genre, entry.book.author, "like");
    addFavorite(entry.book, entry.genre);
    setFavoriteCount(getFavorites().length);
  }

  function handleSelectGenre(genre: string | null) {
    setSelectedGenre(genre);
    selectedGenreRef.current = genre;
    if (genre) selectGenre(genre);
    shownRef.current = new Set();
    setError(null);
    setEntries([]);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    appendBatch();
  }

  return (
    <div className="relative h-dvh w-full">
      <GenreTabs selected={selectedGenre} onSelect={handleSelectGenre} />

      <button
        type="button"
        onClick={() => setShowFavorites(true)}
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+3.25rem)] z-20 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
      >
        <span>♥</span>
        <span>{favoriteCount}</span>
      </button>

      {error && entries.length === 0 ? (
        <div className="flex h-dvh items-center justify-center bg-black text-red-400">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-dvh items-center justify-center bg-black text-neutral-400">
          書棚を並べています…
        </div>
      ) : (
        <div ref={scrollRef} className="h-dvh snap-y snap-mandatory overflow-y-scroll">
          {entries.map((entry, i) => (
            <FeedCard
              key={`${entry.book.isbn}-${i}`}
              book={entry.book}
              genre={entry.genre}
              reason={entry.reason}
              onLike={() => handleLike(entry)}
              onPurchaseClick={() => recordSignal(entry.genre, entry.book.author, "purchase")}
              onDwell={(seconds) => recordDwell(entry.genre, entry.book.author, seconds)}
            />
          ))}
          <div ref={sentinelRef} className="h-1" />
        </div>
      )}

      {showFavorites && <FavoritesPage onClose={() => setShowFavorites(false)} />}
    </div>
  );
}
