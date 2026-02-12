"use client";

import { motion } from "framer-motion";
import { features } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function FeaturesGrid() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            Features
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to{" "}
            <span className="text-gradient-landing">Create at Scale</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            From content ingestion to final video, ContentHQ handles every step
            with AI-powered precision.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={
                  prefersReducedMotion ? undefined : { opacity: 0, y: 20 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                {/* Glow border on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-xl border border-violet-500/0 transition-colors group-hover:border-violet-500/20" />

                <div className="relative z-10">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/50 dark:to-blue-900/50">
                    <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
