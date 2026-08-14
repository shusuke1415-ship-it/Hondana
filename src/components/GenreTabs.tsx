import { GENRE_TAB_LIST, POPULAR_TAB } from "../lib/recommendation";

interface GenreTabsProps {
  selected: string | null;
  onSelect: (genre: string | null) => void;
}

export function GenreTabs({ selected, onSelect }: GenreTabsProps) {
  return (
    <div className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-20 flex gap-2 overflow-x-auto bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition ${
          selected === null
            ? "bg-amber-500 text-white"
            : "bg-black/30 text-white/80"
        }`}
      >
        おすすめ
      </button>
      <button
        type="button"
        onClick={() => onSelect(POPULAR_TAB)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition ${
          selected === POPULAR_TAB
            ? "bg-amber-500 text-white"
            : "bg-black/30 text-white/80"
        }`}
      >
        人気
      </button>
      {GENRE_TAB_LIST.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onSelect(genre)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition ${
            selected === genre
              ? "bg-amber-500 text-white"
              : "bg-black/30 text-white/80"
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
