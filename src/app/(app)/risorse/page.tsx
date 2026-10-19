import { Suspense } from "react";
import type { Metadata } from "next";
import { ResourcesPage } from "@/components/resources/resources-page";

export const metadata: Metadata = { title: "Study Resources" };

export default function Page() {
  return (
    <Suspense>
      <ResourcesPage />
    </Suspense>
  );
}
