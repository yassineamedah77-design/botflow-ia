import type { Metadata } from "next";
import { LandingPage, landingMetadata } from "@/components/landing/landing-page";

export const metadata: Metadata = landingMetadata("en");

export default function EnLandingPage() {
  return <LandingPage lang="en" />;
}
