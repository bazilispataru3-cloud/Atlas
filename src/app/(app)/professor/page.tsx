import type { Metadata } from "next";
import { ProfessorPage } from "@/components/professor/professor-page";

export const metadata: Metadata = { title: "AI Professor" };

export default function Page() {
  return <ProfessorPage />;
}
