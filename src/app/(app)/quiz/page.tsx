import { Suspense } from "react";
import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz/quiz-page";

export const metadata: Metadata = { title: "Quiz e simulazioni" };

export default function Page() {
  return (
    <Suspense>
      <QuizPage />
    </Suspense>
  );
}
