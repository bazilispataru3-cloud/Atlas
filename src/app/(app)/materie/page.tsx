import type { Metadata } from "next";
import { SubjectsOverview } from "@/components/subjects/subjects-overview";

export const metadata: Metadata = { title: "Le mie materie" };

export default function Page() {
  return <SubjectsOverview />;
}
