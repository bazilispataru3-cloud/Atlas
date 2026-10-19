"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { Toaster } from "@/components/ui/toast";
import { StartStudyModal } from "@/components/study/start-study-modal";
import { ProfessorPanel } from "@/components/professor/professor-panel";
import { Onboarding } from "./onboarding";
import { useAtlas } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const reduceMotion = useAtlas((s) => s.settings.reduceMotion);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return (
    <div className="relative z-10 min-h-dvh">
      <a href="#contenuto" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-azure-500 focus:px-3 focus:py-2 focus:text-white">
        Vai al contenuto
      </a>
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar />
        <main id="contenuto" className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <MobileNav />
      <StartStudyModal />
      <ProfessorPanel />
      <Onboarding />
      <Toaster />
    </div>
  );
}
