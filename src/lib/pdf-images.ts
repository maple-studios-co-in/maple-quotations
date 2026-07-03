import "server-only";
import sharp from "sharp";

// Crops item product photos out of catalog PDF pages. The vision model returns
// each photo's bounding box as page percentages; we render only the needed
// pages, crop with a little padding, and hand back small JPEG data URLs that
// drop straight into the builder's existing item imageUrl field.

export type PhotoBox = { page: number; x: number; y: number; w: number; h: number };

const PAD_PCT = 1.5; // breathing room around the model's box
const THUMB_WIDTH = 360;

async function renderPages(pdfBuffer: Buffer, wanted: Set<number>): Promise<Map<number, Buffer>> {
  const { pdf } = await import("pdf-to-img");
  const doc = await pdf(pdfBuffer, { scale: 2 });
  const out = new Map<number, Buffer>();
  const last = Math.max(...wanted);
  let n = 0;
  for await (const png of doc) {
    n++;
    if (wanted.has(n)) out.set(n, png as Buffer);
    if (n >= last) break;
  }
  return out;
}

/** Crop one photo box (percent coords) from a rendered page PNG. */
async function cropBox(pagePng: Buffer, box: PhotoBox): Promise<string | null> {
  const img = sharp(pagePng);
  const meta = await img.metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) return null;

  const x = Math.max(0, ((box.x - PAD_PCT) / 100) * W);
  const y = Math.max(0, ((box.y - PAD_PCT) / 100) * H);
  const w = Math.min(W - x, ((box.w + PAD_PCT * 2) / 100) * W);
  const h = Math.min(H - y, ((box.h + PAD_PCT * 2) / 100) * H);
  if (w < 20 || h < 20) return null;

  const buf = await img
    .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

/** For each box (null entries preserved), returns a data-URL thumbnail or null. */
export async function cropItemPhotos(pdfBuffer: Buffer, boxes: (PhotoBox | null)[]): Promise<(string | null)[]> {
  const wanted = new Set(boxes.filter((b): b is PhotoBox => !!b).map((b) => b.page));
  if (!wanted.size) return boxes.map(() => null);
  const pages = await renderPages(pdfBuffer, wanted);
  return Promise.all(
    boxes.map(async (box) => {
      if (!box) return null;
      const page = pages.get(box.page);
      if (!page) return null;
      try {
        return await cropBox(page, box);
      } catch {
        return null;
      }
    })
  );
}
