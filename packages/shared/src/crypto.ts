/** Kriptografi berbasis WebCrypto (tersedia di Workers & Node 20+). */

const enc = new TextEncoder();

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** Token acak url-safe (default 32 byte). */
export function randomToken(bytes = 32): string {
  return toBase64(randomBytes(bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return toHex(new Uint8Array(digest));
}

export const PBKDF2_MAX_ITER = 100_000; // batas maksimum PBKDF2 di Workers

export interface PasswordHash {
  hash: string; // base64
  salt: string; // base64
  iter: number;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iter },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iter: number): Promise<PasswordHash> {
  const it = Math.min(Math.max(1000, Math.floor(iter)), PBKDF2_MAX_ITER);
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, it);
  return { hash: toBase64(hash), salt: toBase64(salt), iter: it };
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const actual = await pbkdf2(password, fromBase64(stored.salt), stored.iter);
  return constantTimeEqual(actual, fromBase64(stored.hash));
}

/** Hash tiruan untuk menyamakan waktu respons saat username tidak ditemukan. */
export async function dummyPasswordWork(iter: number): Promise<void> {
  await pbkdf2("dummy-password", new Uint8Array(16), Math.min(iter, PBKDF2_MAX_ITER));
}

const WORDS = [
  "Kopi", "Mangga", "Pisang", "Melati", "Rambutan", "Jeruk", "Kelapa", "Durian", "Salak", "Nanas",
  "Merpati", "Elang", "Rajawali", "Kenari", "Cendana", "Jati", "Bambu", "Anggrek", "Mawar", "Teratai",
  "Pelangi", "Samudra", "Gunung", "Sungai", "Bintang", "Bulan", "Mentari", "Awan", "Pantai", "Danau",
];

function randInt(max: number): number {
  const b = randomBytes(4);
  const n = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  return n % max;
}

/** Password sementara mudah dibaca, mis. "Kopi-Mangga-4821". */
export function generateTempPassword(): string {
  const a = WORDS[randInt(WORDS.length)];
  let b = WORDS[randInt(WORDS.length)];
  while (b === a) b = WORDS[randInt(WORDS.length)];
  const n = String(randInt(10000)).padStart(4, "0");
  return `${a}-${b}-${n}`;
}
