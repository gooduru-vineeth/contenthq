"use client";

import dynamic from "next/dynamic";
import { ScrollProgress } from "./ScrollProgress";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";

const ScrollingTicker = dynamic(() => import("./ScrollingTicker"));
const TrustedBySection = dynamic(() => import("./TrustedBySection"));
const PipelineSection = dynamic(() => import("./PipelineSection"));
const FeaturesGrid = dynamic(() => import("./FeaturesGrid"));
const MediaStudioShowcase = dynamic(() => import("./MediaStudioShowcase"));
const HowItWorksSection = dynamic(() => import("./HowItWorksSection"));
const IntegrationsSection = dynamic(() => import("./IntegrationsSection"));
const TestimonialsSection = dynamic(() => import("./TestimonialsSection"));
const PricingSection = dynamic(() => import("./PricingSection"));
const FAQSection = dynamic(() => import("./FAQSection"));
const CTASection = dynamic(() => import("./CTASection"));
const LandingFooter = dynamic(() => import("./LandingFooter"));

export function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <ScrollProgress />
      <LandingHeader />
      <HeroSection />
      <ScrollingTicker />
      <TrustedBySection />
      <PipelineSection />
      <FeaturesGrid />
      <MediaStudioShowcase />
      <HowItWorksSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
