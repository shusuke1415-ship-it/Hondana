export interface Book {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover: string;
  synopsis: string;
  /** A real product page URL, when the data source provides one (e.g. Rakuten). */
  purchaseUrl?: string;
  /** Review count/average, when the data source provides them (e.g. Rakuten). */
  reviewCount?: number;
  reviewAverage?: number;
}

interface OpenBDSummary {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover: string;
}

interface OpenBDTextContent {
  TextType: string;
  Text: string;
}

interface OpenBDEntry {
  summary: OpenBDSummary;
  onix?: {
    CollateralDetail?: {
      TextContent?: OpenBDTextContent[];
    };
  };
}

function extractSynopsis(entry: OpenBDEntry): string {
  const contents = entry.onix?.CollateralDetail?.TextContent ?? [];
  const description = contents.find((c) => c.Text)?.Text ?? "";
  return description.replace(/<[^>]+>/g, "").trim();
}

export async function fetchBooks(isbns: string[]): Promise<Book[]> {
  const url = `https://api.openbd.jp/v1/get?isbn=${isbns.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`openBD request failed: ${res.status}`);
  }
  const data: (OpenBDEntry | null)[] = await res.json();

  return data
    .filter((entry): entry is OpenBDEntry => entry !== null)
    .map((entry) => ({
      isbn: entry.summary.isbn,
      title: entry.summary.title,
      author: entry.summary.author?.split(/[,／]/)[0]?.trim() ?? "",
      publisher: entry.summary.publisher,
      cover: entry.summary.cover,
      synopsis: extractSynopsis(entry),
    }));
}
