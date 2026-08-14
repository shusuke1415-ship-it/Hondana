import { useEffect, useState } from "react";
import { fetchBooks, type Book } from "../lib/openbd";
import { seedBooks } from "../data/seedBooks";
import { BookCard } from "./BookCard";

export function Bookshelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks(seedBooks.map((b) => b.isbn))
      .then(setBooks)
      .catch(() => setError("本の情報を取得できませんでした。時間をおいて再度お試しください。"))
      .finally(() => setLoading(false));
  }, []);

  const genreByIsbn = new Map(seedBooks.map((b) => [b.isbn, b.genre]));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        書棚を並べています…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-6 p-8">
      {books.map((book) => (
        <BookCard
          key={book.isbn}
          book={book}
          genre={genreByIsbn.get(book.isbn) ?? ""}
        />
      ))}
    </div>
  );
}
