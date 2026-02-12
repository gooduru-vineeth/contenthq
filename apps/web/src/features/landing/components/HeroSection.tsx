"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Play,
  Download,
  GitBranch,
  Mic,
  Bot,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { heroStats } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { FloatingCard } from "./FloatingCard";

const pills = [
  { label: "YouTube Ingestion", icon: Download },
  { label: "7-Stage Pipeline", icon: Zap },
  { label: "6 TTS Providers", icon: Mic },
  { label: "Multi-Provider AI", icon: Bot },
  { label: "Visual Flow Builder", icon: GitBranch },
  { label: "Credit-Based", icon: CreditCard },
];

export function HeroSection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Gradient orbs */}
        {!prefersReducedMotion && (
          <>
            <motion.div
              animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"
            />
            <motion.div
              animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -top-16 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
            />
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
            />
          </>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8 inline-flex">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            AI-Powered Content Pipeline
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Transform{" "}
          <span className="text-gradient-landing">Raw Content</span>
          <br className="hidden sm:block" /> Into Polished Videos{" "}
          <br className="hidden sm:block" />
          with{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            AI
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          A 7-stage automated pipeline that ingests content, writes stories,
          generates visuals, adds narration, and assembles polished videos — all
          powered by multi-provider AI.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          variants={itemVariants}
          className="mb-10 flex flex-wrap items-center justify-center gap-2"
        >
          {pills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm"
            >
              <pill.icon className="h-3 w-3" />
              {pill.label}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600"
            asChild
          >
            <Link href="/register">
              <Zap className="mr-2 h-4 w-4" />
              Start Free — 50 Credits
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-foreground/20 text-foreground hover:bg-accent"
            asChild
          >
            <Link href="#pipeline">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Link>
          </Button>
        </motion.div>

        {/* Three.js Floating Card */}
        <motion.div variants={itemVariants} className="mb-12">
          <FloatingCard />
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {heroStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-gradient-landing sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
