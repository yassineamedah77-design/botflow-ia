import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/site/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Botflow — Agence Automatisation IA pour PME & Startups | France",
    template: "%s | Botflow",
  },
  description:
    "Agence française d'automatisation IA. Workflows n8n + Claude, agents IA sur-mesure, formation Claude/ChatGPT. Audit gratuit · ROI dès 4 semaines · PME et startups.",
  metadataBase: new URL("https://botflow-ia.fr"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Botflow — Agence Automatisation IA",
    description: "Workflows IA, agents sur-mesure, formation Claude pour PME et startups françaises.",
    url: "https://botflow-ia.fr",
    siteName: "Botflow",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Botflow — Agence Automatisation IA",
    description: "Workflows IA pour PME françaises.",
  },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
