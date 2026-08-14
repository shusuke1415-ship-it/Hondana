const AMAZON_ASSOCIATE_TAG = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG as
  | string
  | undefined;

export function buildAmazonPurchaseUrl(isbn: string): string {
  const url = new URL("https://www.amazon.co.jp/s");
  url.searchParams.set("k", isbn);
  if (AMAZON_ASSOCIATE_TAG) {
    url.searchParams.set("tag", AMAZON_ASSOCIATE_TAG);
  }
  return url.toString();
}
