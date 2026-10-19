import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudySession } from "@/components/study/session";
import { getTopicRef } from "@/data/syllabus";
import type { StudyMode } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  return { title: getTopicRef(topicId)?.topic.title ?? "Sessione di studio" };
}

export default async function StudyPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { topicId } = await params;
  const { mode } = await searchParams;
  if (!getTopicRef(topicId)) notFound();
  const m: StudyMode = mode === "fast" || mode === "ultra" ? mode : "deep";
  return <StudySession key={`${topicId}-${m}`} topicId={topicId} mode={m} />;
}
