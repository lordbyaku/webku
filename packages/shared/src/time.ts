export const DAY_MS = 86_400_000;

/** Tambah 1 tahun kalender (UTC). 29 Feb → 28 Feb tahun berikutnya. */
export function addOneYear(ms: number): number {
  const d = new Date(ms);
  const y = d.getUTCFullYear() + 1;
  const m = d.getUTCMonth();
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
  return Date.UTC(y, m, day, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

export type HostingState = "none" | "ok" | "expiring_30" | "expiring_7" | "expired";

export function hostingState(until: number | null | undefined, now = Date.now()): HostingState {
  if (!until) return "none";
  const left = until - now;
  if (left <= 0) return "expired";
  if (left <= 7 * DAY_MS) return "expiring_7";
  if (left <= 30 * DAY_MS) return "expiring_30";
  return "ok";
}

/** Tanggal UTC 'YYYY-MM-DD'. */
export function utcDate(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Format tanggal Indonesia di zona WIB, mis. "18 November 2026". */
export function formatTanggalWIB(ms: number): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(ms);
}

export function formatRupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}
