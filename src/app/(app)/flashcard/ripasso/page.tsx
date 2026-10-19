import { Suspense } from "react";
import type { Metadata } from "next";
import { ReviewSession } from "@/components/flashcards/review-session";

export const metadata: Metadata = { title: "Ripasso flashcard" };

export default function Page() {
  return (
    <Suspense>
      <ReviewSession />
    </Suspense>
  );
}
