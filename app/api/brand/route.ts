import { NextResponse } from "next/server";
import { getBrand } from "@maple/core/lib/brand";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await getBrand()); }
