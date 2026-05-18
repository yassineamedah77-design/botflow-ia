import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/site/Analytics";
import { Clarity } from "@/components/site/Clarity";

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
    default:
      "BotFlow IA — IA & automatisation pour cliniques esthétiques et instituts de beauté · FR / PT",
    template: "%s | BotFlow IA",
  },
  description:
    "Sofia, votre assistante virtuelle IA bilingue (FR/PT/EN). Répond 24/7 sur WhatsApp & Instagram, qualifie vos clientes, remplit votre agenda Planity/Treatwell. Pour cliniques esthétiques, instituts de beauté, spas et médecine esthétique. France & Portugal. Conforme RGPD.",
  metadataBase: new URL("https://botflow-ia.fr"),
  alternates: { canonical: "/" },
  keywords: [
    "agence IA clinique esthétique",
    "chatbot WhatsApp institut beauté",
    "automatisation spa",
    "IA médecine esthétique",
    "Planity automatisation",
    "Treatwell automatisation",
    "Zolmi automatisation",
    "assistante virtuelle clinique",
    "AEO clinique esthétique",
    "réactivation clientes spa",
    "machine à contenus Instagram esthétique",
    "no-show institut beauté",
    "agência IA clínica estética Portugal",
  ],
  openGraph: {
    title:
      "BotFlow IA — L'IA qui remplit l'agenda des cliniques esthétiques & instituts de beauté",
    description:
      "Sofia répond 24/7 sur WhatsApp & Instagram, qualifie vos clientes, remplit Planity/Treatwell. FR · PT · EN. Conforme RGPD.",
    url: "https://botflow-ia.fr",
    siteName: "BotFlow IA",
    locale: "fr_FR",
    alternateLocale: ["pt_PT", "en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "BotFlow IA — IA pour cliniques esthétiques & instituts de beauté",
    description:
      "Sofia, votre assistante virtuelle IA bilingue. Répond 24/7, remplit votre agenda.",
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
        <Clarity />
      </body>
    </html>
  );
}
