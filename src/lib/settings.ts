import "server-only";
import crypto from "node:crypto";
import { prisma } from "./prisma";

// Runtime settings, editable from the admin Settings page. Resolution order:
// DB row (set via the dashboard) -> environment variable -> default.
// Secrets are AES-256-GCM encrypted at rest with a key derived from AUTH_SECRET,
// so a database dump alone doesn't leak them.

export const SETTING_DEFS = {
  anthropicApiKey: { env: "ANTHROPIC_API_KEY", secret: true, default: "" },
  aiParseModel: { env: "AI_PARSE_MODEL", secret: false, default: "claude-fable-5" },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;

export const AI_MODEL_OPTIONS = [
  { id: "claude-fable-5", label: "Fable 5 (most capable, best for handwriting)" },
  { id: "claude-opus-4-8", label: "Opus 4.8 (very capable)" },
  { id: "claude-sonnet-5", label: "Sonnet 5 (fast, cheaper, fine for clean PDFs)" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 (cheapest, printed text only)" },
];

function encKey(): Buffer {
  return crypto.createHash("sha256").update(process.env.AUTH_SECRET || "dev-insecure-secret-change-me").digest();
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

function decrypt(stored: string): string {
  if (!stored.startsWith("enc:")) return stored;
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export async function getSetting(key: SettingKey): Promise<string> {
  const def = SETTING_DEFS[key];
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row?.value) return def.secret ? decrypt(row.value) : row.value;
  } catch {
    // DB unavailable -> fall through to env
  }
  return process.env[def.env] || def.default;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const def = SETTING_DEFS[key];
  const stored = def.secret && value ? encrypt(value) : value;
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: stored }, update: { value: stored } });
}

export async function clearSetting(key: SettingKey): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key } });
}

/** Last 4 characters for display; never return a full secret to the client. */
export function maskSecret(v: string): string | null {
  if (!v) return null;
  return `••••${v.slice(-4)}`;
}
