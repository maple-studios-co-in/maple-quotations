import { NextResponse } from "next/server";
import { tenantDb } from "@maple/core/lib/tenant-db";
export const dynamic = "force-dynamic";
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await (await tenantDb()).quotation.findFirst({ where: { id } }))) return NextResponse.json({ error: "Not found in tenant" }, { status: 404 });
  await (await tenantDb()).quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
