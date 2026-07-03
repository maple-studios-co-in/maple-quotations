import { NextResponse } from "next/server";
import { parseCatalogPdf, locateItemPhotos, photoKey, CatalogParseError, type ParsedCatalog, type PhotoBox } from "@maple/core/lib/catalog-parse";
import { cropItemPhotos } from "@maple/core/lib/pdf-images";

export const dynamic = "force-dynamic";
// Vision parsing of a full catalog can take minutes.
export const maxDuration = 600;

const MAX_PDF_BYTES = 30 * 1024 * 1024; // API request limit is 32MB; leave headroom

function badPdf(f: unknown): f is File {
  return f instanceof File && (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
}

export async function POST(req: Request) {
  // Session + tool access are enforced by the middleware for /api routes.
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!badPdf(file)) return NextResponse.json({ error: "Attach a PDF as the 'file' field." }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is larger than 30MB. Split it and try again." }, { status: 413 });
  }
  // Optional second PDF: the clean client original, used only for item photos.
  const imagesFile = form?.get("imagesFile");
  const cleanPdf = badPdf(imagesFile) && imagesFile.size <= MAX_PDF_BYTES ? imagesFile : null;

  const rateBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseCatalogPdf(rateBuffer.toString("base64"));

    // Attach item photos. Failures here degrade to no images, never a failed parse.
    let imagesFrom: "clean" | "scan" | "none" = "none";
    try {
      if (cleanPdf) {
        const cleanBuffer = Buffer.from(await cleanPdf.arrayBuffer());
        const located = await locateItemPhotos(cleanBuffer.toString("base64"), result.catalog);
        result.usage.input += located.usage.input;
        result.usage.output += located.usage.output;
        await attachImages(result.catalog, cleanBuffer, (room, item) => located.boxes.get(photoKey(room, item.name)) ?? null);
        imagesFrom = "clean";
      } else {
        await attachImages(result.catalog, rateBuffer, (_room, item) => item.photo);
        imagesFrom = "scan";
      }
    } catch (imgErr) {
      console.error("catalog image extraction failed:", imgErr);
      imagesFrom = "none";
    }

    return NextResponse.json({ ...result, imagesFrom });
  } catch (err) {
    if (err instanceof CatalogParseError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Catalog parsing failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function attachImages(
  catalog: ParsedCatalog,
  pdfBuffer: Buffer,
  boxFor: (room: string, item: ParsedCatalog["rooms"][number]["items"][number]) => PhotoBox | null
) {
  const flat = catalog.rooms.flatMap((r) => r.items.map((item) => ({ room: r.name, item })));
  const urls = await cropItemPhotos(
    pdfBuffer,
    flat.map(({ room, item }) => boxFor(room, item))
  );
  flat.forEach(({ item }, i) => {
    if (urls[i]) item.imageUrl = urls[i]!;
  });
}
