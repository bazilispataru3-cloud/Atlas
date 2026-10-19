import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allTopicRefs, getTopicRef } from "@/data/syllabus";
import { TopicPage } from "@/components/subjects/topic-page";

export function generateStaticParams() {
  return allTopicRefs().map((r) => ({ subject: r.subject.id, topicId: r.topic.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const ref = getTopicRef(topicId);
  return { title: ref ? `${ref.topic.title} · ${ref.subject.name}` : "Argomento" };
}

export default async function Page({ params }: { params: Promise<{ subject: string; topicId: string }> }) {
  const { subject, topicId } = await params;
  const ref = getTopicRef(topicId);
  if (!ref || ref.subject.id !== subject) notFound();
  return <TopicPage key={topicId} topicId={topicId} />;
}
