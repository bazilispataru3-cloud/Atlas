import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubject, SUBJECT_IDS } from "@/data/syllabus";
import { SubjectPage } from "@/components/subjects/subject-page";

export function generateStaticParams() {
  return SUBJECT_IDS.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const { subject } = await params;
  return { title: getSubject(subject)?.name ?? "Materia" };
}

export default async function Page({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = getSubject(subject);
  if (!s) notFound();
  return <SubjectPage subjectId={s.id} />;
}
