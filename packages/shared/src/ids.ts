const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

/** ID acak 21 karakter (setara nanoid), dengan prefix opsional, mis. "t_xxx". */
export function newId(prefix?: string, size = 21): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += ALPHABET[b & 63];
  return prefix ? `${prefix}_${id}` : id;
}
