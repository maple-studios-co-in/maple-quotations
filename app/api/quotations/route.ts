import { NextResponse } from "next/server";
import { Prisma } from "@maple/db";
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
  const incomingClientName = typeof b.client?.name === "string" ? b.client.name.trim() : "";

  try {
    const db = await tenantDb();
    // Match within the tenant only (findFirst is tenant-scoped; the raw unique
    // `number` column is global, so a bare upsert could grab another tenant's row).
    const existing = await db.quotation.findFirst({ where: { number: b.number }, include: { client: { select: { name: true } } } });

    // Re-saving your own quote is normal. Silently replacing a DIFFERENT
    // client's quote because two people landed on the same random number is not.
    if (existing && existing.client?.name && incomingClientName && existing.client.name.toLowerCase() !== incomingClientName.toLowerCase()) {
      return NextResponse.json(
        { error: `Quote number ${b.number} already belongs to ${existing.client.name}. Change the quote identifier and save again.` },
        { status: 409 }
      );
    }

    const clientId = await findOrCreateClient(b.client || {});
    const fields = { total: Number(b.total || 0), status: b.status || "draft", data: b.data, clientId };
    const q = existing
      ? await db.quotation.update({ where: { id: existing.id }, data: fields })
      : await db.quotation.create({ data: { number: b.number, ...fields } });
    return NextResponse.json(q);
  } catch (err) {
    // Unique collision: the number already exists outside this tenant.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: `Quote number ${b.number} is already in use. Change the quote identifier and save again.` }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save." }, { status: 503 });
  }
}
