import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "./settings";

// Parses a furniture catalog PDF (scanned pages with handwritten rates, or clean
// text-layer spec sheets) into structured rooms/items using Claude vision.
// The PDF goes to the API as a native document block — no rasterization needed
// (limits: 32MB request, well above our 3-4MB catalogs).

export type PhotoBox = { page: number; x: number; y: number; w: number; h: number };

export type ParsedItem = {
  name: string;
  quantity: number;
  dimensions: string;
  rate: number | null;
  ratePerPiece: boolean;
  notes: string[];
  pending: boolean;
  confidence: "high" | "low";
  photo: PhotoBox | null;
  imageUrl?: string; // attached later by the crop step
};

export type ParsedRoom = { name: string; items: ParsedItem[] };
export type ParsedCatalog = { rooms: ParsedRoom[] };

const PHOTO_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["page", "x", "y", "w", "h"],
      properties: {
        page: { type: "integer", description: "1-based page number the photo is on" },
        x: { type: "number", description: "Photo left edge, percent of page width (0-100)" },
        y: { type: "number", description: "Photo top edge, percent of page height (0-100)" },
        w: { type: "number", description: "Photo width, percent of page width" },
        h: { type: "number", description: "Photo height, percent of page height" },
      },
    },
    { type: "null" },
  ],
  description: "Bounding box of the item's product photograph; null when there is no photo",
} as const;

// Structured-output schema: every object needs additionalProperties:false and
// full `required` lists; numeric constraints are not supported.
const CATALOG_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rooms"],
  properties: {
    rooms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "items"],
        properties: {
          name: { type: "string", description: "Room title as printed, e.g. '405 - LIVING DINING KITCHEN'" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "quantity", "dimensions", "rate", "ratePerPiece", "notes", "pending", "confidence", "photo"],
              properties: {
                name: { type: "string", description: "Item name without the quantity suffix, e.g. 'DINING CHAIR'" },
                quantity: { type: "integer", description: "From 'x 8' style suffixes; 1 when absent" },
                dimensions: { type: "string", description: "Printed dimensions as one line, e.g. 'L 450 x W 450, Seat Ht 450 mm'" },
                rate: { type: ["number", "null"], description: "Rate in rupees. '85K' means 85000. null when absent or pending" },
                ratePerPiece: { type: "boolean", description: "true when marked 'per pc' or similar" },
                notes: { type: "array", items: { type: "string" }, description: "Margin notes like 'with marble', 'SS backrests'" },
                pending: { type: "boolean", description: "true when marked Pending or crossed out without a replacement rate" },
                confidence: { type: "string", enum: ["high", "low"], description: "low when the handwriting is ambiguous" },
                photo: PHOTO_SCHEMA,
              },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You read furniture project catalogs for Maple Furnishers and extract a structured item list.

Each page is one room: a title (e.g. "405 - MASTER BEDROOM") and a grid of items, each with a product photo, a printed name, printed dimensions in mm, and often HANDWRITTEN rates and notes in the margins.

Domain conventions for the handwriting:
- "K" means thousands of rupees: "85K" = 85000, "114K." = 114000.
- "per pc" / "per piece" means the rate is per unit; set ratePerPiece true. Otherwise the rate is for the stated quantity as a whole.
- Quantities appear in the item name: "DINING CHAIR x 8" means quantity 8 (strip the suffix from the name).
- A crossed-out rate with a rewrite next to it means the rewrite is the current rate; ignore the crossed-out value.
- "Pending" (or a crossed-out rate with no replacement) means no rate yet: set pending true and rate null.
- Short margin notes like "with marble", "SS backrests", "without marble, only top" go into notes verbatim.
- Combined items ("BED" + "BACKREST" with one shared rate) become one item named for both, with the shared rate.
- Mark confidence "low" whenever the handwriting could plausibly read two ways; never guess silently.

For each item, also return the bounding box of its product photograph on the page
(photo: page number plus x/y/w/h as percentages of the page). Box the photograph only,
not the text below it. Use null when an item has no photo.

Extract every item on every page. Do not invent rates that are not written.`;

// Second pass for the optional clean client PDF (better print quality, no
// handwriting): locate each already-parsed item's photo so crops come from the
// clean pages instead of the scan.
const LOCATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["room", "name", "photo"],
        properties: {
          room: { type: "string", description: "Room name exactly as given in the list" },
          name: { type: "string", description: "Item name exactly as given in the list" },
          photo: PHOTO_SCHEMA,
        },
      },
    },
  },
} as const;

export async function parseCatalogPdf(pdfBase64: string): Promise<{ catalog: ParsedCatalog; model: string; usage: { input: number; output: number } }> {
  const [apiKey, model] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel")]);
  if (!apiKey) throw new CatalogParseError("No Anthropic API key configured. An admin can add one in Settings.", 503);

  const client = new Anthropic({ apiKey });

  const params = {
    model,
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    schema: CATALOG_SCHEMA as unknown as Record<string, unknown>,
    userText: "Extract all rooms and items from this catalog.",
    pdfBase64,
  };
  const { json, model: served, usage } = await runVisionRequest<ParsedCatalog>(client, model, params);
  return { catalog: json, model: served, usage };
}

/** Locate already-parsed items' photos in a second (clean) PDF, by name+room. */
export async function locateItemPhotos(
  pdfBase64: string,
  catalog: ParsedCatalog
): Promise<{ boxes: Map<string, PhotoBox>; usage: { input: number; output: number } }> {
  const [apiKey, model] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel")]);
  if (!apiKey) throw new CatalogParseError("No Anthropic API key configured. An admin can add one in Settings.", 503);
  const client = new Anthropic({ apiKey });

  const wanted = catalog.rooms.flatMap((r) => r.items.map((it) => ({ room: r.name, name: it.name })));
  const { json, usage } = await runVisionRequest<{ items: { room: string; name: string; photo: PhotoBox | null }[] }>(
    client,
    model,
    {
      system:
        "You locate product photographs in a furniture catalog PDF. For each requested item, return the bounding box of its photograph (page number plus x/y/w/h as percentages of the page). Box the photograph only, not the caption text. Rooms and item names in the PDF may differ slightly in punctuation from the list; match by meaning. Use null when you cannot find the item.",
      schema: LOCATE_SCHEMA as unknown as Record<string, unknown>,
      userText: `Locate the photo for each of these items:\n${JSON.stringify(wanted)}`,
      pdfBase64,
    }
  );

  const boxes = new Map<string, PhotoBox>();
  for (const entry of json.items || []) {
    if (entry.photo) boxes.set(photoKey(entry.room, entry.name), entry.photo);
  }
  return { boxes, usage };
}

export function photoKey(room: string, name: string): string {
  return `${room}::${name}`.toLowerCase().replace(/[^a-z0-9:]+/g, "");
}

async function runVisionRequest<T>(
  client: Anthropic,
  model: string,
  req: { system: string; schema: Record<string, unknown>; userText: string; pdfBase64: string }
): Promise<{ json: T; model: string; usage: { input: number; output: number } }> {
  const params = {
    model,
    max_tokens: 64000,
    system: req.system,
    output_config: { format: { type: "json_schema" as const, schema: req.schema } },
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: req.pdfBase64 } },
          { type: "text" as const, text: req.userText },
        ],
      },
    ],
  };

  // Stream to avoid HTTP timeouts on multi-minute parses. On Fable 5 the
  // safety classifiers can (rarely) decline; opt into the server-side fallback
  // so the same request is transparently re-served by Opus 4.8.
  const message =
    model === "claude-fable-5"
      ? await client.beta.messages
          .stream({ ...params, betas: ["server-side-fallback-2026-06-01"], fallbacks: [{ model: "claude-opus-4-8" }] })
          .finalMessage()
      : await client.messages.stream(params).finalMessage();

  if (message.stop_reason === "refusal") {
    throw new CatalogParseError("The model declined to process this document. Try a different PDF or model.", 502);
  }
  if (message.stop_reason === "max_tokens") {
    throw new CatalogParseError("The catalog is too large for one pass. Split the PDF and try again.", 502);
  }

  // message is Message | BetaMessage (fallbacks path is beta); read text blocks
  // without narrowing across the two block unions.
  let text = "";
  for (const block of message.content as Array<{ type: string; text?: string }>) {
    if (block.type === "text" && typeof block.text === "string") text += block.text;
  }
  if (!text) throw new CatalogParseError("The model returned no content.", 502);

  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new CatalogParseError("Could not parse the model output.", 502);
  }

  return { json, model: message.model, usage: { input: message.usage.input_tokens, output: message.usage.output_tokens } };
}

export class CatalogParseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
