import { NextResponse } from "next/server";
import { tenantDb } from "@maple/core/lib/tenant-db";
export const dynamic = "force-dynamic";

// GET one quotation with its full data blob (the list endpoint returns
// summaries only, so Load fetches the detail on demand).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await (await tenantDb()).quotation.findFirst({ where: { id }, include: { client: { select: { name: true } } } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(q);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await (await tenantDb()).quotation.findFirst({ where: { id } }))) return NextResponse.json({ error: "Not found in tenant" }, { status: 404 });
  await (await tenantDb()).quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
