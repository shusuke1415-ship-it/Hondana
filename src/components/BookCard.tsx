import { useState } from "react";
import { motion } from "framer-motion";
import type { Book } from "../lib/openbd";
import { buildAmazonPurchaseUrl } from "../lib/affiliate";

interface BookCardProps {
  book: Book;
  genre: string;
}

export function BookCard({ book, genre }: BookCardProps) {
  const [flipped, setFlipped] = useState(false);
  const purchaseUrl = buildAmazonPurchaseUrl(book.isbn);

  return (
    <div
      className="group h-72 w-48 cursor-pointer [perspective:1200px]"
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Front: cover */}
        <div className="absolute inset-0 overflow-hidden rounded-lg shadow-lg [backface-visibility:hidden]">
          {book.cover ? (
            <img
              src={book.cover}
              alt={book.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-100 to-amber-300 p-4 text-center dark:from-amber-900 dark:to-amber-700">
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-50">
                {book.title}
              </span>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {genre}
          </span>
        </div>

        {/* Back: synopsis + purchase */}
        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-lg bg-white p-4 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-neutral-800">
          <div className="overflow-y-auto">
            <h3 className="mb-1 text-sm font-bold text-neutral-900 dark:text-neutral-50">
              {book.title}
            </h3>
            {book.author && (
              <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                {book.author}
              </p>
            )}
            <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
              {book.synopsis || "あらすじは準備中です。"}
            </p>
          </div>
          <a
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 block rounded-md bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-amber-600"
          >
            この本を購入する
          </a>
        </div>
      </motion.div>
    </div>
  );
}
