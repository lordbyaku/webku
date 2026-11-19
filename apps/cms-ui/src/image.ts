/** Kompres foto di browser → WebP (fallback JPEG), sisi terpanjang ≤ 1600 px, target ≤ 400 KB. */
export interface Compressed {
  blob: Blob;
  width: number;
  height: number;
  ext: string;
}

const TARGET = 400_000;

function toBlob(canvas: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob(res, type, q));
}

async function load(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      /* fallback */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File): Promise<Compressed> {
  if (!file.type.startsWith("image/")) throw new Error("File yang dipilih bukan foto.");
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await load(file);
  } catch {
    throw new Error("Foto tidak bisa dibaca. Coba foto lain (format JPG atau PNG).");
  }
  const w0 = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h0 = "naturalHeight" in src ? src.naturalHeight : src.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let best: Compressed | null = null;
  for (const maxSide of [1600, 1280, 1024]) {
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    canvas.width = Math.round(w0 * scale);
    canvas.height = Math.round(h0 * scale);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.72, 0.62]) {
      let blob = await toBlob(canvas, "image/webp", q);
      let ext = "webp";
      if (!blob || blob.type !== "image/webp") {
        blob = await toBlob(canvas, "image/jpeg", q);
        ext = "jpg";
      }
      if (!blob) continue;
      best = { blob, width: canvas.width, height: canvas.height, ext };
      if (blob.size <= TARGET) return best;
    }
  }
  if (best && best.blob.size <= 500_000) return best;
  throw new Error("Foto terlalu besar meski sudah diperkecil. Coba foto lain.");
}
