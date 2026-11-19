// Membuat favicon.ico (PNG di dalam ICO) & apple-touch-icon.png default untuk situs pelanggan,
// supaya permintaan otomatis browser dilayani Static Assets (gratis) dan tidak memanggil Worker.
import fs from "node:fs";
import zlib from "node:zlib";

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** Lingkaran netral (abu kehijauan) dengan titik di tengah, latar transparan. */
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const inner = d < r * 0.28;
      const ring = d < r * 0.96;
      const a = ring ? 255 : Math.max(0, Math.min(255, Math.round((r - d) * 255)));
      const [cr, cg, cb] = inner ? [255, 255, 255] : [74, 90, 84];
      raw[i] = cr; raw[i + 1] = cg; raw[i + 2] = cb; raw[i + 3] = d < r ? a : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function ico(pngBuf, size) {
  const h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h[6] = size; h[7] = size; h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12);
  h.writeUInt32LE(pngBuf.length, 14); h.writeUInt32LE(22, 18);
  return Buffer.concat([h, pngBuf]);
}
const dir = new URL("../apps/site-worker/public/", import.meta.url);
fs.writeFileSync(new URL("favicon.ico", dir), ico(png(32), 32));
fs.writeFileSync(new URL("apple-touch-icon.png", dir), png(180));
fs.writeFileSync(new URL("apple-touch-icon-precomposed.png", dir), png(180));
console.log("ikon dibuat");
