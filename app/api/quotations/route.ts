import { NextResponse } from "next/server";
import { tenantDb } from "@maple/core/lib/tenant-db";
import { findOrCreateClient } from "@maple/core/lib/clientLink";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await (await tenantDb()).quotation.findMany({ orderBy: { createdAt: "desc" }, include: { client: { select: { name: true } } } }));
  } catch {
    return NextResponse.json({ error: "Database not reachable. Set DATABASE_URL and run prisma migrate." }, { status: 503 });
  }
}
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.number) return NextResponse.json({ error: "Quote number required." }, { status: 400 });
  try {
    const clientId = await findOrCreateClient(b.client || {});
    const q = await (await tenantDb()).quotation.upsert({
      where: { number: b.number },
      create: { number: b.number, total: Number(b.total || 0), status: b.status || "draft", data: b.data, clientId },
      update: { total: Number(b.total || 0), status: b.status || "draft", data: b.data, clientId },
    });
    return NextResponse.json(q);
  } catch {
    return NextResponse.json({ error: "Could not save." }, { status: 503 });
  }
}
