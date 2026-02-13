"use client";

import { tickerStats } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function ScrollingTicker() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const items = [...tickerStats, ...tickerStats];

  return (
    <section className="relative overflow-hidden border-y bg-muted/30 py-4">
      <div
        className="flex w-max gap-12"
        style={{
          animation: prefersReducedMotion
            ? "none"
            : "scroll-ticker 30s linear infinite",
        }}
      >
        {items.map((stat, i) => (
          <div key={`${stat.label}-${i}`} className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-lg font-bold text-gradient-ticker">
              {stat.value}
            </span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ScrollingTicker;
