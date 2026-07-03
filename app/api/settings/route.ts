import { NextResponse } from "next/server";
import { getSession } from "@maple/core/lib/auth";
import { getSetting, setSetting, clearSetting, maskSecret, AI_MODEL_OPTIONS } from "@maple/core/lib/settings";
import { currentTenant, invalidateBrandCache } from "@maple/core/lib/brand";
import { prisma } from "@maple/core/lib/prisma";

export const dynamic = "force-dynamic";

const COMPANY_FIELDS = [
  "brandName",
  "logoUrl",
  "bannerUrl",
  "primaryColor",
  "addressLine1",
  "addressLine2",
  "phone",
  "email",
  "gstin",
  "website",
  "tagline",
] as const;
type CompanyField = (typeof COMPANY_FIELDS)[number];

async function requireAdmin() {
  const user = await getSession();
  if (!user) return null;
  const isAdmin = user.perms.includes("*") || user.role === "admin";
  return isAdmin ? user : null;
}

async function companyPayload() {
  const t = await currentTenant();
  if (!t) return null;
  return Object.fromEntries(COMPANY_FIELDS.map((f) => [f, t[f]])) as Record<CompanyField, string | null>;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [apiKey, model, company] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel"), companyPayload()]);
  return NextResponse.json({
    anthropicApiKey: maskSecret(apiKey),
    aiParseModel: model,
    modelOptions: AI_MODEL_OPTIONS,
    company,
  });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (typeof body.aiParseModel === "string" && body.aiParseModel) {
    if (!AI_MODEL_OPTIONS.some((m) => m.id === body.aiParseModel)) {
      return NextResponse.json({ error: "Unknown model" }, { status: 400 });
    }
    await setSetting("aiParseModel", body.aiParseModel);
  }

  if (typeof body.anthropicApiKey === "string") {
    const v = body.anthropicApiKey.trim();
    if (v === "") {
      // Explicit empty string clears the stored key (falls back to env).
      await clearSetting("anthropicApiKey");
    } else {
      if (!v.startsWith("sk-ant-")) return NextResponse.json({ error: "That doesn't look like an Anthropic API key" }, { status: 400 });
      await setSetting("anthropicApiKey", v);
    }
  }

  if (body.company && typeof body.company === "object") {
    const patch: Partial<Record<CompanyField, string | null>> = {};
    for (const f of COMPANY_FIELDS) {
      if (!(f in body.company)) continue;
      const raw = body.company[f];
      if (raw === null) { patch[f] = null; continue; }
      if (typeof raw !== "string") return NextResponse.json({ error: `${f} must be a string` }, { status: 400 });
      const v = raw.trim();
      patch[f] = v === "" ? null : v;
    }
    if (Object.keys(patch).length > 0) {
      const t = await currentTenant();
      if (!t) return NextResponse.json({ error: "No tenant configured" }, { status: 400 });
      // brandName is non-nullable in the schema; clearing it resets to the default.
      const { brandName, ...nullable } = patch;
      await prisma.tenant.update({
        where: { id: t.id },
        data: { ...nullable, ...(brandName !== undefined ? { brandName: brandName ?? "Maple Furnishers" } : {}) },
      });
      invalidateBrandCache();
    }
  }

  // Never echo secrets back; respond with the masked current state.
  const [apiKey, model, company] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel"), companyPayload()]);
  return NextResponse.json({ ok: true, anthropicApiKey: maskSecret(apiKey), aiParseModel: model, company });
}
