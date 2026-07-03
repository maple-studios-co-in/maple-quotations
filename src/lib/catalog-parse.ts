import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "./settings";

// Parses a furniture catalog PDF (scanned pages with handwritten rates, or clean
// text-layer spec sheets) into structured rooms/items using Claude vision.
// The PDF goes to the API as a native document block — no rasterization needed
// (limits: 32MB request, well above our 3-4MB catalogs).

export type ParsedItem = {
  name: string;
  quantity: number;
  dimensions: string;
  rate: number | null;
  ratePerPiece: boolean;
  notes: string[];
  pending: boolean;
  confidence: "high" | "low";
};

export type ParsedRoom = { name: string; items: ParsedItem[] };
export type ParsedCatalog = { rooms: ParsedRoom[] };

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
              required: ["name", "quantity", "dimensions", "rate", "ratePerPiece", "notes", "pending", "confidence"],
              properties: {
                name: { type: "string", description: "Item name without the quantity suffix, e.g. 'DINING CHAIR'" },
                quantity: { type: "integer", description: "From 'x 8' style suffixes; 1 when absent" },
                dimensions: { type: "string", description: "Printed dimensions as one line, e.g. 'L 450 x W 450, Seat Ht 450 mm'" },
                rate: { type: ["number", "null"], description: "Rate in rupees. '85K' means 85000. null when absent or pending" },
                ratePerPiece: { type: "boolean", description: "true when marked 'per pc' or similar" },
                notes: { type: "array", items: { type: "string" }, description: "Margin notes like 'with marble', 'SS backrests'" },
                pending: { type: "boolean", description: "true when marked Pending or crossed out without a replacement rate" },
                confidence: { type: "string", enum: ["high", "low"], description: "low when the handwriting is ambiguous" },
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

Extract every item on every page. Do not invent rates that are not written.`;

export async function parseCatalogPdf(pdfBase64: string): Promise<{ catalog: ParsedCatalog; model: string; usage: { input: number; output: number } }> {
  const [apiKey, model] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel")]);
  if (!apiKey) throw new CatalogParseError("No Anthropic API key configured. An admin can add one in Settings.", 503);

  const client = new Anthropic({ apiKey });

  const params = {
    model,
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema" as const, schema: CATALOG_SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: "Extract all rooms and items from this catalog." },
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

  let catalog: ParsedCatalog;
  try {
    catalog = JSON.parse(text) as ParsedCatalog;
  } catch {
    throw new CatalogParseError("Could not parse the model output.", 502);
  }

  return {
    catalog,
    model: message.model,
    usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}

export class CatalogParseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
