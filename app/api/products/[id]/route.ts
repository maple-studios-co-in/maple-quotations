import { NextResponse } from "next/server";
import { prisma, type Product } from "@maple/db";
import { getTenantId } from "@maple/core/lib/tenant";
import { assetUrl, createAssetFromDataUrl } from "@maple/core/lib/assets";

export const dynamic = "force-dynamic";

function serializeProduct(p: Product) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    specification: p.specification,
    material: p.material,
    unitType: p.unitType,
    defaultRate: p.defaultRate,
    imageUrl: p.imageAssetId ? assetUrl(p.imageAssetId) : null,
    updatedAt: p.updatedAt,
  };
}

// PATCH /api/products/:id — update library fields; imageDataUrl swaps the linked asset.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  if (b.name !== undefined && !String(b.name).trim()) {
    return NextResponse.json({ error: "Product name cannot be empty." }, { status: 400 });
  }

  let imageAssetId: string | undefined;
  if (b.imageDataUrl) {
    const created = await createAssetFromDataUrl("product", String(b.name ?? existing.name), b.imageDataUrl);
    if (created) imageAssetId = created.id;
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
      ...(b.category !== undefined ? { category: b.category || null } : {}),
      ...(b.specification !== undefined ? { specification: b.specification || null } : {}),
      ...(b.material !== undefined ? { material: b.material || null } : {}),
      ...(b.unitType !== undefined ? { unitType: b.unitType || "nos" } : {}),
      ...(b.defaultRate !== undefined ? { defaultRate: b.defaultRate != null ? Number(b.defaultRate) : null } : {}),
      ...(imageAssetId ? { imageAssetId } : {}),
    },
  });
  return NextResponse.json(serializeProduct(product));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The linked asset stays in the gallery; it can be removed from there.
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
