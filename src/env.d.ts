/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_ALLOWLIST?: string;
  readonly VITE_ENABLE_DEV_OVERRIDE?: string;
  readonly VITE_DEV_OVERRIDE_CODE?: string;
  readonly VITE_ENABLE_DEV_PANEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
