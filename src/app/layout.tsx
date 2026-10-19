import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ATLAS STUDY — Semestre filtro di Medicina",
    template: "%s · ATLAS STUDY",
  },
  description:
    "Piattaforma di apprendimento per il semestre filtro di Medicina e Chirurgia: syllabus ufficiale MUR 2026/27, modalità Fast, Deep e Ultra, flashcard, simulazioni e risorse universitarie verificate.",
  applicationName: "ATLAS STUDY",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#040406",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="atlas-backdrop atlas-grain min-h-dvh">{children}</body>
    </html>
  );
}
