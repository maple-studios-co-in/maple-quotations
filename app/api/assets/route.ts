import { NextResponse } from "next/server";
import { prisma } from "@maple/db";
import { createAsset, ASSET_KINDS, MAX_ASSET_BYTES, assetUrl, type AssetKind } from "@maple/core/lib/assets";

export const dynamic = "force-dynamic";

// GET /api/assets?kind=product&q=chair — list gallery/brand assets (no bytes).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const q = url.searchParams.get("q")?.trim();
  const assets = await prisma.asset.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, kind: true, name: true, mime: true, createdAt: true },
  });
  return NextResponse.json(assets.map((a) => ({ ...a, url: assetUrl(a.id) })));
}

// POST /api/assets — multipart upload: file, kind, name?
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") || "");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach an image as 'file'." }, { status: 400 });
  if (!ASSET_KINDS.includes(kind as AssetKind)) return NextResponse.json({ error: "kind must be logo, banner, or product." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images are supported." }, { status: 400 });
  if (file.size > MAX_ASSET_BYTES) return NextResponse.json({ error: "Image is larger than 4MB." }, { status: 413 });

  const name = String(form?.get("name") || file.name || "untitled");
  const created = await createAsset(kind as AssetKind, name, file.type, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json(created);
}
