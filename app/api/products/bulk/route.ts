import { NextResponse } from "next/server";
import { prisma } from "@maple/db";
import { getTenantId } from "@maple/core/lib/tenant";
import { createAssetFromDataUrl, nextProductCode } from "@maple/core/lib/assets";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 200;

type BulkItem = {
  name?: string;
  category?: string;
  specification?: string;
  material?: string;
  unitType?: string;
  rate?: number;
  imageDataUrl?: string;
};

// POST /api/products/bulk — upsert reviewed AI-import items into the library.
// Dedupe on name + specification (case-insensitive; null == empty). Sequential
// on purpose: codes come from the Counter row.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const allItems: BulkItem[] = Array.isArray(b.items) ? b.items : [];
  const items = allItems.slice(0, MAX_ITEMS);
  const skipped = allItems.length - items.length;
  const tenantId = await getTenantId();

  let created = 0;
  let updated = 0;
  for (const it of items) {
    const name = typeof it.name === "string" ? it.name.trim() : "";
    if (!name) continue;
    const spec = typeof it.specification === "string" ? it.specification.trim() : "";
    const rate = it.rate != null && Number.isFinite(Number(it.rate)) ? Number(it.rate) : null;

    const existing = await prisma.product.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: "insensitive" },
        ...(spec
          ? { specification: { equals: spec, mode: "insensitive" } }
          : { OR: [{ specification: null }, { specification: "" }] }),
      },
    });

    if (existing) {
      const imageAssetId =
        !existing.imageAssetId && it.imageDataUrl
          ? (await createAssetFromDataUrl("product", name, it.imageDataUrl))?.id ?? null
          : null;
      if (rate != null || imageAssetId) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...(rate != null ? { defaultRate: rate } : {}),
            ...(imageAssetId ? { imageAssetId } : {}),
          },
        });
      }
      updated++;
    } else {
      const imageAssetId = it.imageDataUrl ? (await createAssetFromDataUrl("product", name, it.imageDataUrl))?.id ?? null : null;
      await prisma.product.create({
        data: {
          tenantId,
          code: await nextProductCode(),
          name,
          category: it.category || null,
          specification: spec || null,
          material: it.material || null,
          unitType: it.unitType || "nos",
          defaultRate: rate,
          imageAssetId,
          source: "ai-import",
        },
      });
      created++;
    }
  }
  return NextResponse.json({ created, updated, skipped });
}
