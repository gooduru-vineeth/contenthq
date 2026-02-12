"use client";

import { motion } from "framer-motion";
import { integrations } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

const categories = [
  {
    key: "source" as const,
    label: "Import From",
    gradient: "from-cta-500 to-cta-600",
  },
  {
    key: "publish" as const,
    label: "Publish To",
    gradient: "from-brand-400 to-brand-500",
  },
  {
    key: "ai" as const,
    label: "Powered By",
    gradient: "from-brand-600 to-brand-700",
  },
];

export function IntegrationsSection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            Integrations
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Works With the Tools{" "}
            <span className="text-gradient-landing">You Already Use</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Import from your favorite platforms and publish everywhere your
            audience lives.
          </p>
        </motion.div>

        <div className="space-y-10">
          {categories.map((cat) => (
            <div key={cat.key}>
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                {cat.label}
              </h3>
              <div className="flex flex-wrap gap-3">
                {integrations
                  .filter((i) => i.category === cat.key)
                  .map((integration, idx) => (
                    <motion.div
                      key={`${integration.name}-${integration.category}`}
                      initial={
                        prefersReducedMotion
                          ? undefined
                          : { opacity: 0, scale: 0.9 }
                      }
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={
                        prefersReducedMotion ? undefined : { scale: 1.05 }
                      }
                      className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-2.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${cat.gradient} text-[10px] font-bold text-white`}
                      >
                        {integration.abbreviation}
                      </div>
                      <span className="text-sm font-medium">
                        {integration.name}
                      </span>
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
