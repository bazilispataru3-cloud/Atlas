import { Suspense } from "react";
import type { Metadata } from "next";
import { Simulation } from "@/components/quiz/simulation";

export const metadata: Metadata = { title: "Simulazione d’esame" };

export default function Page() {
  return (
    <Suspense>
      <Simulation />
    </Suspense>
  );
}
