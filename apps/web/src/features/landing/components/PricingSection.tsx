"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingTiers } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function PricingSection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-cta-200 bg-cta-50 px-3 py-1 text-xs font-medium text-cta-700 dark:border-cta-800 dark:bg-cta-950/50 dark:text-cta-300">
            Pricing
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent{" "}
            <span className="text-gradient-landing">Pricing</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={
                prefersReducedMotion ? undefined : { opacity: 0, y: 20 }
              }
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative flex flex-col rounded-xl border p-6 shadow-sm ${
                tier.popular
                  ? "border-brand-300 bg-gradient-to-b from-brand-50/50 to-background shadow-lg ring-1 ring-brand-200 dark:border-brand-700 dark:from-brand-950/30 dark:ring-brand-800"
                  : "bg-card"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-700 to-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  {tier.price !== "Custom" && (
                    <span className="ml-1 text-sm text-muted-foreground">
                      /{tier.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400">
                  {tier.credits}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={
                  tier.popular
                    ? "bg-gradient-to-r from-cta-500 to-cta-600 text-white shadow-md hover:from-cta-600 hover:to-cta-700"
                    : ""
                }
                variant={tier.popular ? "default" : "outline"}
                asChild
              >
                <Link href={tier.name === "Enterprise" ? "#" : "/register"}>
                  {tier.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
