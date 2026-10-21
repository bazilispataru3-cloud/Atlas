import { Suspense } from "react";
import type { Metadata } from "next";
import { ResourcesPage } from "@/components/resources/resources-page";

export const metadata: Metadata = {
  title: "Study Resources",
  description: "Corsi, videolezioni e manuali gratuiti per il semestre filtro, collegati agli argomenti del programma.",
};

/** Shown while the client reads the URL (?topic=) and the saved preferences. */
function Loading() {
  return (
    <div aria-busy="true" aria-label="Caricamento del catalogo" className="lg:pr-16 min-[1600px]:pr-0">
      <div className="skeleton h-10 w-full max-w-xl rounded-control" />
      <div className="skeleton mt-4 h-5 w-full max-w-2xl rounded-control" />
      <div className="skeleton mt-8 h-12 w-full rounded-control" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-card" />
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ResourcesPage />
    </Suspense>
  );
}
