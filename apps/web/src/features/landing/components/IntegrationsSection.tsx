"use client";

import { motion } from "framer-motion";
import { integrations } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

const categories = [
  {
    key: "ai" as const,
    label: "AI Providers",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    key: "tts" as const,
    label: "TTS Providers",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    key: "source" as const,
    label: "Content Sources",
    gradient: "from-amber-500 to-orange-500",
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
          <span className="mb-3 inline-block rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
            Integrations
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Powered by the{" "}
            <span className="text-gradient-landing">Best Providers</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Multi-provider architecture with automatic failover — always get
            results.
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
                      key={integration.name}
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
