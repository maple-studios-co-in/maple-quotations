import "server-only";
import { prisma } from "./prisma";
import { getTenantId } from "./tenant";

// Shared asset helpers: brand images (logo, banner) and the product gallery.

export const ASSET_KINDS = ["logo", "banner", "product"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const MAX_ASSET_BYTES = 4 * 1024 * 1024;

export function assetUrl(id: string): string {
  return `/api/assets/${id}`;
}

export async function createAsset(kind: AssetKind, name: string, mime: string, data: Buffer): Promise<{ id: string; url: string }> {
  const tenantId = await getTenantId();
  const asset = await prisma.asset.create({ data: { kind, name, mime, data: new Uint8Array(data), tenantId } });
  return { id: asset.id, url: assetUrl(asset.id) };
}

/** Store a `data:image/...;base64,...` string (e.g. an AI-cropped item photo). */
export async function createAssetFromDataUrl(kind: AssetKind, name: string, dataUrl: string): Promise<{ id: string; url: string } | null> {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX_ASSET_BYTES) return null;
  return createAsset(kind, name, m[1], buf);
}

/** Next product code, e.g. MF-P-0001. Atomic via the Counter row; the very
 *  first two concurrent calls can race on the create — retry settles it. */
export async function nextProductCode(): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const c = await prisma.counter.upsert({
        where: { key: "product" },
        create: { key: "product", value: 1 },
        update: { value: { increment: 1 } },
      });
      return `MF-P-${String(c.value).padStart(4, "0")}`;
    } catch (err) {
      if (attempt > 0) throw err;
    }
  }
}
