"use client";

import { motion } from "framer-motion";
import { trustedCompanies } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function TrustedBySection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:flex-nowrap lg:gap-5">
          {trustedCompanies.map((company, i) => (
            <motion.div
              key={company.name}
              initial={
                prefersReducedMotion ? undefined : { opacity: 0, y: 10 }
              }
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-bold text-white">
                {company.initials}
              </div>
              <span className="whitespace-nowrap text-sm font-medium">{company.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustedBySection;
