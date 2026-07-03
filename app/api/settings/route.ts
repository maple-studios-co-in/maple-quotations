import { NextResponse } from "next/server";
import { getSession } from "@maple/core/lib/auth";
import { getSetting, setSetting, clearSetting, maskSecret, AI_MODEL_OPTIONS } from "@maple/core/lib/settings";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  if (!user) return null;
  const isAdmin = user.perms.includes("*") || user.role === "admin";
  return isAdmin ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [apiKey, model] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel")]);
  return NextResponse.json({
    anthropicApiKey: maskSecret(apiKey),
    aiParseModel: model,
    modelOptions: AI_MODEL_OPTIONS,
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

  // Never echo secrets back; respond with the masked current state.
  const [apiKey, model] = await Promise.all([getSetting("anthropicApiKey"), getSetting("aiParseModel")]);
  return NextResponse.json({ ok: true, anthropicApiKey: maskSecret(apiKey), aiParseModel: model });
}
