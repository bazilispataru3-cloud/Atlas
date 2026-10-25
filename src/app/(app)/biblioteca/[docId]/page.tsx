import type { Metadata } from "next";
import { DocReader } from "@/components/library/doc-reader";

export const metadata: Metadata = { title: "Lettore" };

type Search = { [key: string]: string | string[] | undefined };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** /biblioteca/<id>?p=<page>&q=<search>: links from the library search open the right page with the matches lit. */
export default async function Page({ params, searchParams }: { params: Promise<{ docId: string }>; searchParams: Promise<Search> }) {
  const { docId } = await params;
  const sp = await searchParams;
  const p = Number.parseInt(first(sp.p) ?? "", 10);
  const q = (first(sp.q) ?? "").slice(0, 200);
  return <DocReader key={docId} docId={docId} initialPage={Number.isFinite(p) && p > 0 ? p : undefined} initialQuery={q || undefined} />;
}
