import { useEffect, useRef, useState } from "react";
import { fetchBooks, type Book } from "../lib/openbd";
import { seedBooks } from "../data/seedBooks";
import { pickNext, recordSignal, type FeedEntry } from "../lib/recommendation";
import { FeedCard } from "./FeedCard";

const BATCH_SIZE = 5;

export function Feed() {
  const [books, setBooks] = useState<Map<string, Book> | null>(null);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchBooks(seedBooks.map((b) => b.isbn))
      .then((fetched) => {
        setBooks(new Map(fetched.map((b) => [b.isbn, b])));
      })
      .catch(() => setError("本の情報を取得できませんでした。時間をおいて再度お試しください。"));
  }, []);

  useEffect(() => {
    if (!books) return;
    appendBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  function appendBatch() {
    const next: FeedEntry[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const entry = pickNext(shownRef.current);
      if (entry) next.push(entry);
    }
    setEntries((prev) => [...prev, ...next]);
  }

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
  }, [entries.length > 0]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-900 text-red-400">
        {error}
      </div>
    );
  }

  if (!books) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-900 text-neutral-400">
        書棚を並べています…
      </div>
    );
  }

  return (
    <div className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth">
      {entries.map((entry, i) => {
        const book = books.get(entry.book.isbn);
        if (!book) return null;
        return (
          <FeedCard
            key={`${entry.book.isbn}-${i}`}
            book={book}
            genre={entry.book.genre}
            reason={entry.reason}
            onLike={() => recordSignal(entry.book.genre, "like")}
            onDislike={() => recordSignal(entry.book.genre, "dislike")}
          />
        );
      })}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
