import type { Metadata } from "next";
import { AcademyIndex } from "@/components/academy/academy-index";

export const metadata: Metadata = { title: "Study Academy" };

export default function Page() {
  return <AcademyIndex />;
}
