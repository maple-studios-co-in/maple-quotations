import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOCS, getDoc } from "@maple/core/lib/docs";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return { title: doc ? `${doc.meta.title} · Maple Quotations` : "Docs" };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  return (
    <article className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:before:content-[''] prose-code:after:content-[''] prose-th:text-foreground prose-td:text-foreground/80">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
      <hr className="my-8 border-border" />
      <Link href="/docs" className="text-sm font-medium text-primary no-underline hover:underline">← All docs</Link>
    </article>
  );
}
