/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_ALLOWLIST?: string;
  readonly VITE_ENABLE_DEV_OVERRIDE?: string;
  readonly VITE_DEV_OVERRIDE_CODE?: string;
  readonly VITE_ENABLE_DEV_PANEL?: string;
  readonly VITE_ENABLE_ANONYMOUS_AUTH?: string;
  readonly VITE_STRICT_TENANT_CLAIMS?: string;
  readonly VITE_ENABLE_AUTO_SEED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
