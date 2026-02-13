"use client";

import { ScrollProgress } from "./ScrollProgress";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { TrustedBySection } from "./TrustedBySection";
import { PipelineSection } from "./PipelineSection";
import { FeaturesGrid } from "./FeaturesGrid";
import { MediaStudioShowcase } from "./MediaStudioShowcase";
import { HowItWorksSection } from "./HowItWorksSection";
import { IntegrationsSection } from "./IntegrationsSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { CTASection } from "./CTASection";
import { LandingFooter } from "./LandingFooter";

export function LandingPage() {
  return (
    <main className="overflow-x-hidden">
      <ScrollProgress />
      <LandingHeader />
      <HeroSection />
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
