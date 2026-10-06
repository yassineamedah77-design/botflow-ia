import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { connection } from "next/server";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SOFIA — Revenue Recovery & Booking for Beauty Clinics",
    template: "%s · SOFIA",
  },
  description:
    "SOFIA répond à vos clientes 24 h/24 sur WhatsApp, Instagram et votre site, récupère les leads perdus et remplit votre agenda.",
  applicationName: "SOFIA",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page is rendered per request: the Content-Security-Policy nonce set
  // by src/proxy.ts can only be applied to dynamically rendered HTML.
  await connection();
  return (
    <html lang="fr" className={`${inter.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
