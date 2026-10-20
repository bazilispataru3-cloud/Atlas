"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav, hidesMobileNav } from "./mobile-nav";
import { Toaster } from "@/components/ui/toast";
import { StartStudyModal } from "@/components/study/start-study-modal";
import { ProfessorPanel } from "@/components/professor/professor-panel";
import { Onboarding } from "./onboarding";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const reduceMotion = useAtlas((s) => s.settings.reduceMotion);
  const pathname = usePathname();
  const focusMode = useUI((s) => s.focusMode);
  const withTabBar = !focusMode && !hidesMobileNav(pathname);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return (
    <div className="relative z-10 min-h-dvh">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-control focus:bg-azure-500 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Vai al contenuto
      </a>
      {!focusMode && <Sidebar />}
      <div className={focusMode ? undefined : "lg:pl-[248px]"}>
        {!focusMode && <Topbar />}
        <main
          id="contenuto"
          tabIndex={-1}
          className={cn(
            "mx-auto w-full max-w-[1240px] px-4 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-8",
            withTabBar ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
            focusMode && "pt-[max(1rem,env(safe-area-inset-top))] lg:pt-6",
          )}
        >
          {children}
        </main>
      </div>
      {!focusMode && <MobileNav />}
      <StartStudyModal />
      <ProfessorPanel />
      <Onboarding />
      <Toaster />
    </div>
  );
}
