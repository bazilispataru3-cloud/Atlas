import type { Metadata } from "next";
import { CalendarPage } from "@/components/calendar/calendar-page";

export const metadata: Metadata = { title: "Calendario" };

export default function Page() {
  return <CalendarPage />;
}
