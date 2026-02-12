"use client";

import { motion } from "framer-motion";
import { trustedCompanies } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function TrustedBySection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
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
              className="flex items-center gap-3 rounded-lg border bg-card px-5 py-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                {company.initials}
              </div>
              <span className="text-sm font-medium">{company.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
