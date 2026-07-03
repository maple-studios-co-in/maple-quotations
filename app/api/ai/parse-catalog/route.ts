import { NextResponse } from "next/server";
import { parseCatalogPdf, CatalogParseError } from "@maple/core/lib/catalog-parse";

export const dynamic = "force-dynamic";
// Vision parsing of a full catalog can take minutes.
export const maxDuration = 600;

const MAX_PDF_BYTES = 30 * 1024 * 1024; // API request limit is 32MB; leave headroom

export async function POST(req: Request) {
  // Session + tool access are enforced by the middleware for /api routes.
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a PDF as the 'file' field." }, { status: 400 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF catalogs are supported." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is larger than 30MB. Split it and try again." }, { status: 413 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const result = await parseCatalogPdf(base64);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CatalogParseError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Catalog parsing failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
