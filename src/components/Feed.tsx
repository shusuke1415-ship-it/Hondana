import { useEffect, useRef, useState } from "react";
import { pickNext, recordSignal, type FeedEntry } from "../lib/recommendation";
import { FeedCard } from "./FeedCard";

const BATCH_SIZE = 5;

export function Feed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
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
  }, []);

  if (error && entries.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-900 text-red-400">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-900 text-neutral-400">
        書棚を並べています…
      </div>
    );
  }

  return (
    <div className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      {entries.map((entry, i) => (
        <FeedCard
          key={`${entry.book.isbn}-${i}`}
          book={entry.book}
          genre={entry.genre}
          reason={entry.reason}
          onLike={() => recordSignal(entry.genre, "like")}
          onDislike={() => recordSignal(entry.genre, "dislike")}
        />
      ))}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
