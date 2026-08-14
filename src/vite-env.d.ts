/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAZON_ASSOCIATE_TAG?: string;
  readonly VITE_RAKUTEN_APPLICATION_ID?: string;
  readonly VITE_RAKUTEN_ACCESS_KEY?: string;
  readonly VITE_RAKUTEN_ALLOWED_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
