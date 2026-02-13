"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, CreditCard, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const trustBadges = [
  { icon: X, label: "No credit card" },
  { icon: Zap, label: "50 free credits" },
  { icon: CreditCard, label: "Cancel anytime" },
];

export function CTASection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="relative overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500" />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Sparkles className="mx-auto mb-6 h-10 w-10 text-cta-300" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl text-gradient-cta">
            Ready to Create Your First Video?
          </h2>
          <p className="mb-10 text-lg text-white/80">
            Try ContentHQ free — no credit card needed. Your first video is
            minutes away.
          </p>

          <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-white text-brand-700 shadow-lg hover:bg-white/90"
              asChild
            >
              <Link href="/register">
                <Zap className="mr-2 h-4 w-4" />
                Get Started Free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              asChild
            >
              <Link href="#">Talk to Sales</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <badge.icon className="h-4 w-4" />
                {badge.label}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default CTASection;
