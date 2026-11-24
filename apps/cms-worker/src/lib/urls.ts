/**
 * Semua URL publik dibentuk di sini.
 *
 * - Kunci internal situs (R2 `h/<host>/…`, tabel hostnames): `<slug>.<ROOT_DOMAIN>`.
 *   Pada mode path, ini hanya label penyimpanan — bukan nama DNS.
 * - URL publik pelanggan: SITE_URL_PATTERN, mis. "https://web.rela.my.id/{slug}/".
 * - Domain milik pelanggan (Fase 7) tersimpan sebagai hostname sendiri → https://<host>/.
 */
import type { Env } from "../env";

export function internalHost(env: Pick<Env, "ROOT_DOMAIN">, slug: string): string {
  return `${slug}.${env.ROOT_DOMAIN}`;
}

/** URL publik utama situs pelanggan (selalu diakhiri "/"). */
export function siteUrl(env: Pick<Env, "ROOT_DOMAIN" | "SITE_URL_PATTERN">, slug: string): string {
  return env.SITE_URL_PATTERN ? env.SITE_URL_PATTERN.replace("{slug}", slug) : `https://${slug}.${env.ROOT_DOMAIN}/`;
}

/** URL publik untuk sebuah hostname tersimpan (alamat platform atau domain milik pelanggan). */
export function publicUrlForHost(env: Pick<Env, "ROOT_DOMAIN" | "SITE_URL_PATTERN">, slug: string, host: string): string {
  return host === internalHost(env, slug) ? siteUrl(env, slug) : `https://${host}/`;
}

/** Alamat merek / landing page. */
export function brandUrl(env: Pick<Env, "ROOT_DOMAIN" | "BRAND_URL">): string {
  return env.BRAND_URL || `https://${env.ROOT_DOMAIN}`;
}

/** Untuk ditampilkan ke manusia: tanpa protokol & garis miring akhir. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
