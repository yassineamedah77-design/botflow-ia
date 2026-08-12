import type { Metadata } from "next";
import { LandingPage, landingMetadata } from "@/components/landing/landing-page";

export const metadata: Metadata = landingMetadata("pt");

export default function PtLandingPage() {
  return <LandingPage lang="pt" />;
}
