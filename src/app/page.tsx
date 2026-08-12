import type { Metadata } from "next";
import { LandingPage, landingMetadata } from "@/components/landing/landing-page";

export const metadata: Metadata = landingMetadata("fr");

export default function FrLandingPage() {
  return <LandingPage lang="fr" />;
}
