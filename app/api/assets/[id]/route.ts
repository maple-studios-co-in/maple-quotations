import { NextResponse } from "next/server";
import { prisma } from "@maple/db";

export const dynamic = "force-dynamic";

// GET /api/assets/:id — serve the image bytes. Ids are immutable, cache hard.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Detach from any products referencing it, then remove.
  await prisma.product.updateMany({ where: { imageAssetId: id }, data: { imageAssetId: null } });
  await prisma.asset.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
