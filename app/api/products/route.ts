import { NextResponse } from "next/server";
import { prisma, type Product } from "@maple/db";
import { getTenantId } from "@maple/core/lib/tenant";
import { assetUrl, createAssetFromDataUrl, nextProductCode } from "@maple/core/lib/assets";

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

// GET /api/products?q=sofa — search the product library.
export async function GET(req: Request) {
  const tenantId = await getTenantId();
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { specification: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(products.map(serializeProduct));
}

// POST /api/products — create a manual product.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Product name is required." }, { status: 400 });

  if (b.defaultRate != null && !Number.isFinite(Number(b.defaultRate))) {
    return NextResponse.json({ error: "defaultRate must be a number." }, { status: 400 });
  }
  const tenantId = await getTenantId();
  const imageAssetId = b.imageDataUrl ? (await createAssetFromDataUrl("product", name, b.imageDataUrl))?.id ?? null : null;
  const product = await prisma.product.create({
    data: {
      tenantId,
      code: await nextProductCode(),
      name,
      category: b.category || null,
      specification: b.specification || null,
      material: b.material || null,
      unitType: b.unitType || "nos",
      defaultRate: b.defaultRate != null ? Number(b.defaultRate) : null,
      imageAssetId,
    },
  });
  return NextResponse.json(serializeProduct(product));
}
