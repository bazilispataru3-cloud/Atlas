import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTechnique, TECHNIQUES } from "@/data/academy";
import { TechniquePage } from "@/components/academy/technique-page";

export function generateStaticParams() {
  return TECHNIQUES.map((t) => ({ technique: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ technique: string }> }): Promise<Metadata> {
  const { technique } = await params;
  return { title: getTechnique(technique)?.name ?? "Study Academy" };
}

export default async function Page({ params }: { params: Promise<{ technique: string }> }) {
  const { technique } = await params;
  if (!getTechnique(technique)) notFound();
  return <TechniquePage key={technique} id={technique} />;
}
