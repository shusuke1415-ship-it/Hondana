import { useState } from "react";
import { getFavorites, removeFavorite, type FavoriteEntry } from "../lib/favorites";
import { buildAmazonPurchaseUrl } from "../lib/affiliate";

interface FavoritesPageProps {
  onClose: () => void;
}

export function FavoritesPage({ onClose }: FavoritesPageProps) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() => getFavorites());

  function handleRemove(isbn: string) {
    removeFavorite(isbn);
    setFavorites((prev) => prev.filter((f) => f.book.isbn !== isbn));
  }

  return (
    <div className="fixed inset-0 z-30 h-dvh overflow-y-auto bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-neutral-950/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-white">気になる本 ({favorites.length})</h1>
      </header>

      {favorites.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-neutral-400">
          まだ気になる本がありません。フィードでハートを押すと、ここに集まります。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">
          {favorites.map(({ book, genre }) => {
            const amazonUrl = buildAmazonPurchaseUrl(book.isbn);
            return (
              <div
                key={book.isbn}
                className="relative overflow-hidden rounded-lg bg-neutral-900 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => handleRemove(book.isbn)}
                  aria-label="気になるを解除"
                  className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
                >
                  ✕
                </button>
                <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-800">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-neutral-400">
                      {book.title}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <span className="mb-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300">
                    {genre}
                  </span>
                  <p className="line-clamp-2 text-xs font-semibold text-white">
                    {book.title}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {book.purchaseUrl && (
                      <a
                        href={book.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-full bg-amber-500 py-1.5 text-center text-[10px] font-semibold text-white"
                      >
                        楽天
                      </a>
                    )}
                    <a
                      href={amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-full bg-white/15 py-1.5 text-center text-[10px] font-semibold text-white"
                    >
                      Amazon
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className="flex justify-center gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 text-xs text-neutral-500">
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline">
          プライバシーポリシー
        </a>
        <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="underline">
          利用規約
        </a>
      </footer>
    </div>
  );
}
