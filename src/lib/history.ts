// Tracks recently-shown ISBNs across sessions so closing and reopening the
// app doesn't replay the same books — the in-memory `shown` set the feed
// uses during a session would otherwise reset on every page load.

const STORAGE_KEY = "serendipity-seen-history";
const MAX_HISTORY = 500;

export function loadSeenHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendSeenHistory(newIsbns: Iterable<string>) {
  try {
    const existing = loadSeenHistory();
    const combined = [...existing, ...newIsbns];
    const deduped = Array.from(new Set(combined));
    const trimmed =
      deduped.length > MAX_HISTORY ? deduped.slice(deduped.length - MAX_HISTORY) : deduped;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable — the session just won't remember past visits
  }
}
