import { useEffect, useRef, useState } from "react";
import type { Book } from "../lib/openbd";
import { buildAmazonPurchaseUrl } from "../lib/affiliate";

interface FeedCardProps {
  book: Book;
  genre: string;
  reason: string;
  onLike: () => void;
  onDislike: () => void;
  onPurchaseClick: () => void;
  onDwell: (seconds: number) => void;
}

const DOUBLE_TAP_WINDOW_MS = 300;
const HEART_BURST_MS = 700;

export function FeedCard({
  book,
  genre,
  reason,
  onLike,
  onDislike,
  onPurchaseClick,
  onDwell,
}: FeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const purchaseUrl = book.purchaseUrl ?? buildAmazonPurchaseUrl(book.isbn);

  const sectionRef = useRef<HTMLElement | null>(null);
  const enteredAtRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  function handleLike() {
    if (liked) return;
    setLiked(true);
    setDisliked(false);
    onLike();
  }

  function handleDislike() {
    if (disliked) return;
    setDisliked(true);
    setLiked(false);
    onDislike();
  }

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
      handleLike();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), HEART_BURST_MS);
    }
    lastTapRef.current = now;
  }

  // Watch-time style implicit signal: how long this card stayed mostly
  // on screen before the user scrolled past it.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          enteredAtRef.current = Date.now();
        } else if (enteredAtRef.current !== null) {
          const seconds = (Date.now() - enteredAtRef.current) / 1000;
          enteredAtRef.current = null;
          onDwell(seconds);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.isbn]);

  return (
    <section
      ref={sectionRef}
      onClick={handleTap}
      className="relative h-dvh w-full snap-start snap-always touch-manipulation select-none overflow-hidden bg-black"
    >
      {/* full-bleed cover as the entire screen's background */}
      {book.cover ? (
        <img
          src={book.cover}
          alt={book.title}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-200 to-amber-500 p-8 text-center">
          <span className="text-xl font-bold text-amber-950">{book.title}</span>
        </div>
      )}

      {/* scrim for text legibility, stronger at top and bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/60" />

      {showHeartBurst && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-8xl text-white/90 [animation:heart-pop_0.7s_ease-out]">
          ♥
        </span>
      )}

      {/* reason chip, top */}
      <p className="absolute inset-x-6 top-[calc(env(safe-area-inset-top)+1rem)] rounded-full bg-white/10 px-3 py-1 text-center text-xs text-amber-200 backdrop-blur-sm">
        {reason}
      </p>

      {/* right-side action rail, TikTok style */}
      <div className="absolute bottom-40 right-3 z-10 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDislike();
          }}
          aria-label="興味ない"
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl backdrop-blur-sm transition ${
            disliked
              ? "bg-neutral-600 text-white"
              : "bg-black/30 text-white/90 hover:bg-black/50"
          }`}
        >
          ✕
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          aria-label="気になる"
          className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl backdrop-blur-sm transition ${
            liked
              ? "bg-amber-500 text-white"
              : "bg-black/30 text-white/90 hover:bg-black/50"
          }`}
        >
          ♥
        </button>
      </div>

      {/* bottom text block: title / author / synopsis / purchase CTA */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pr-20">
        <span className="mb-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-100 backdrop-blur-sm">
          {genre}
        </span>
        <h2 className="text-lg font-bold text-white drop-shadow">{book.title}</h2>
        {book.author && (
          <p className="mt-0.5 text-sm text-neutral-200">{book.author}</p>
        )}
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-200">
          {book.synopsis || "あらすじは準備中です。"}
        </p>

        <a
          href={purchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            onPurchaseClick();
          }}
          className="mt-3 block rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          この本を購入する
        </a>
      </div>
    </section>
  );
}
