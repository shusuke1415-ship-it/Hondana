import { useEffect, useRef, useState } from "react";
import { pickNext, recordDwell, recordSignal, type FeedEntry } from "../lib/recommendation";
import { addFavorite, getFavorites } from "../lib/favorites";
import { FeedCard } from "./FeedCard";
import { FavoritesPage } from "./FavoritesPage";

const BATCH_SIZE = 5;

export function Feed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(() => getFavorites().length);
  const shownRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function appendBatch() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next: FeedEntry[] = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const entry = await pickNext(shownRef.current);
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

  if (error && entries.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-red-400">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-neutral-400">
        書棚を並べています…
      </div>
    );
  }

  function handleLike(entry: FeedEntry) {
    recordSignal(entry.genre, entry.book.author, "like");
    addFavorite(entry.book, entry.genre);
    setFavoriteCount(getFavorites().length);
  }

  return (
    <div className="relative h-dvh w-full">
      <button
        type="button"
        onClick={() => setShowFavorites(true)}
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
      >
        <span>♥</span>
        <span>{favoriteCount}</span>
      </button>

      <div className="h-dvh snap-y snap-mandatory overflow-y-scroll">
        {entries.map((entry, i) => (
          <FeedCard
            key={`${entry.book.isbn}-${i}`}
            book={entry.book}
            genre={entry.genre}
            reason={entry.reason}
            onLike={() => handleLike(entry)}
            onDislike={() => recordSignal(entry.genre, entry.book.author, "dislike")}
            onPurchaseClick={() => recordSignal(entry.genre, entry.book.author, "purchase")}
            onDwell={(seconds) => recordDwell(entry.genre, entry.book.author, seconds)}
          />
        ))}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {showFavorites && <FavoritesPage onClose={() => setShowFavorites(false)} />}
    </div>
  );
}
