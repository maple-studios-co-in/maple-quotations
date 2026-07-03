import "server-only";
import fs from "node:fs";
import path from "node:path";

export type DocMeta = { slug: string; title: string; file: string; audience: "user" | "dev" };

// Public docs served at /docs/<slug>. Files live in the repo's /docs folder.
export const DOCS: DocMeta[] = [
  { slug: "user-guide", title: "User Guide", file: "USER_GUIDE.md", audience: "user" },
  { slug: "developer", title: "Developer Guide", file: "DEVELOPER.md", audience: "dev" },
  { slug: "testing", title: "Testing", file: "TESTING.md", audience: "dev" },
  { slug: "auto-generation", title: "Auto-Generation Plan", file: "AUTO_GENERATION.md", audience: "dev" },
  { slug: "roadmap", title: "Roadmap", file: "ROADMAP.md", audience: "dev" },
];

export function getDoc(slug: string): { meta: DocMeta; content: string } | null {
  const meta = DOCS.find((d) => d.slug === slug);
  if (!meta) return null;
  const full = path.join(process.cwd(), "docs", meta.file);
  try {
    return { meta, content: fs.readFileSync(full, "utf8") };
  } catch {
    return null;
  }
}
