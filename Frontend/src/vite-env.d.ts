/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_NAYAXA_API_URL: string;
  readonly VITE_NAYAXA_API_KEY: string;
  // Tambahkan variabel lain di sini
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
