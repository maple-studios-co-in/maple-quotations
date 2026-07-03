import "server-only";

// Each environment runs its own Flipt; FLIPT_URL points at it. Unset (e.g. local dev)
// => fail-open: everything enabled. Flags only need to exist in Flipt to DISABLE a
// tool/feature or to gate a brand-new one.
const FLIPT_URL = process.env.FLIPT_URL;
const NAMESPACE = process.env.FLIPT_NAMESPACE || "default";
const TTL = 30_000;
const cache = new Map<string, { v: boolean; t: number }>();

export async function isEnabled(key: string, fallback = true): Promise<boolean> {
  if (!FLIPT_URL) return fallback;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  try {
    const res = await fetch(`${FLIPT_URL}/evaluate/v1/boolean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namespaceKey: NAMESPACE, flagKey: key, entityId: "suite", context: {} }),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return fallback; // flag missing / Flipt error -> fail open
    const j = await res.json();
    const v = typeof j.enabled === "boolean" ? j.enabled : fallback;
    cache.set(key, { v, t: Date.now() });
    return v;
  } catch {
    return fallback;
  }
}

/** Batch helper — returns the subset of tool keys that are enabled. */
export async function enabledTools(tools: string[]): Promise<Set<string>> {
  const results = await Promise.all(tools.map((t) => isEnabled(`tool.${t}`)));
  return new Set(tools.filter((_, i) => results[i]));
}
