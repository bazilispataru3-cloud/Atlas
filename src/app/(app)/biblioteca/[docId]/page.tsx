import type { Metadata } from "next";
import { DocReader } from "@/components/library/doc-reader";

export const metadata: Metadata = { title: "Lettore" };

export default async function Page({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  return <DocReader key={docId} docId={docId} />;
}
