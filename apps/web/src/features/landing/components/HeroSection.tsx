"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Play,
  Link as LinkIcon,
  Pencil,
  Mic,
  Image,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { heroStats } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { FloatingCard } from "./FloatingCard";

const pills = [
  { label: "Paste Any Link", icon: LinkIcon },
  { label: "AI Script Writing", icon: Pencil },
  { label: "Natural Voiceovers", icon: Mic },
  { label: "Auto-Generated Visuals", icon: Image },
  { label: "Ready in Minutes", icon: Zap },
  { label: "40+ Languages", icon: Globe },
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
              className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
            />
            <motion.div
              animate={{ y: [0, 20, 0], x: [0, -20, 0] }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -top-16 -right-32 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl"
            />
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl"
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
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Trusted by 500+ Creators
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={itemVariants}
          className="mb-6 text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Turn Any Idea Into a
          <br />
          <span className="text-gradient-landing">Stunning Video</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mb-8 max-w-3xl text-lg text-muted-foreground sm:text-xl"
        >
          Paste a link, type a topic, or upload your content. ContentHQ writes
          the script, creates the visuals, adds a natural voiceover, and
          delivers a ready-to-publish video — in minutes, not days.
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
            className="bg-gradient-to-r from-cta-500 to-cta-600 text-white shadow-lg shadow-cta-500/25 hover:from-cta-600 hover:to-cta-700"
            asChild
          >
            <Link href="/register">
              <Zap className="mr-2 h-4 w-4" />
              Start Creating for Free
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
              See It in Action
            </Link>
          </Button>
        </motion.div>

        {/* Floating Pipeline Card */}
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
