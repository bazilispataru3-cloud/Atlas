import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-8">
      <span className="sr-only">Caricamento della pagina…</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
