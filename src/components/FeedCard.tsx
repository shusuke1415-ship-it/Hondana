import { useState } from "react";
import type { Book } from "../lib/openbd";
import { buildAmazonPurchaseUrl } from "../lib/affiliate";

interface FeedCardProps {
  book: Book;
  genre: string;
  reason: string;
  onLike: () => void;
  onDislike: () => void;
}

export function FeedCard({ book, genre, reason, onLike, onDislike }: FeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const purchaseUrl = buildAmazonPurchaseUrl(book.isbn);

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

  return (
    <section className="relative flex h-dvh w-full snap-start snap-always flex-col items-center justify-center overflow-hidden bg-neutral-900 px-6 py-8">
      {/* blurred backdrop from the cover for atmosphere */}
      {book.cover && (
        <img
          src={book.cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
        />
      )}

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <p className="rounded-full bg-white/10 px-3 py-1 text-center text-xs text-amber-200 backdrop-blur-sm">
          {reason}
        </p>

        <div className="h-72 w-48 overflow-hidden rounded-lg shadow-2xl">
          {book.cover ? (
            <img
              src={book.cover}
              alt={book.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-100 to-amber-300 p-4 text-center">
              <span className="text-sm font-semibold text-amber-900">
                {book.title}
              </span>
            </div>
          )}
        </div>

        <div className="text-center">
          <span className="mb-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-200">
            {genre}
          </span>
          <h2 className="text-lg font-bold text-white">{book.title}</h2>
          {book.author && (
            <p className="mt-1 text-sm text-neutral-400">{book.author}</p>
          )}
        </div>

        <p className="max-h-32 overflow-y-auto text-center text-sm leading-relaxed text-neutral-300">
          {book.synopsis || "あらすじは準備中です。"}
        </p>

        <div className="mt-2 flex w-full items-center gap-3">
          <button
            type="button"
            onClick={handleDislike}
            aria-label="興味ない"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition ${
              disliked
                ? "bg-neutral-600 text-white"
                : "bg-white/10 text-neutral-300 hover:bg-white/20"
            }`}
          >
            ✕
          </button>
          <a
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            この本を購入する
          </a>
          <button
            type="button"
            onClick={handleLike}
            aria-label="気になる"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition ${
              liked
                ? "bg-amber-500 text-white"
                : "bg-white/10 text-neutral-300 hover:bg-white/20"
            }`}
          >
            ♥
          </button>
        </div>
      </div>
    </section>
  );
}
