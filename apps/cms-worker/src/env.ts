export interface Env {
  DB: D1Database;
  SITES: R2Bucket;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;

  ENVIRONMENT: "development" | "staging" | "production";
  ROOT_DOMAIN: string;
  CMS_ORIGIN: string;
  MEDIA_ORIGIN: string;
  BRAND_NAME: string;
  PBKDF2_ITER: string;
  HOSTING_PRICE_IDR: string;
  PAYMENT_INFO: string;
  ADMIN_WA: string;
  TURNSTILE_SITE_KEY: string;
  ZONE_ID?: string;
  /** URL publik situs pelanggan, mis. "https://web.rela.my.id/{slug}/" (mode path). */
  SITE_URL_PATTERN?: string;
  /** Alamat landing page / merek, mis. "https://web.rela.my.id". */
  BRAND_URL?: string;

  // rahasia
  TURNSTILE_SECRET: string;
  CF_PURGE_TOKEN?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  role: "admin" | "owner";
  tenantId: string | null;
  mustChangePw: boolean;
  sessionHash: string;
  expiresAt: number;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { user: SessionUser; tenantId: string };
};
