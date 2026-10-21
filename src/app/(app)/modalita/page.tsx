import type { Metadata } from "next";
import { ModesPage } from "@/components/study/modes-page";

export const metadata: Metadata = { title: "Modalità di studio" };

export default function Page() {
  return <ModesPage />;
}
