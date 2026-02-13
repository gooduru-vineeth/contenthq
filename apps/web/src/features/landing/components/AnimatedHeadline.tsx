"use client";

import { motion } from "framer-motion";

interface AnimatedHeadlineProps {
  prefersReducedMotion: boolean;
}

export function AnimatedHeadline({
  prefersReducedMotion,
}: AnimatedHeadlineProps) {
  const wordVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
      filter: prefersReducedMotion ? "none" : "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.06,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <motion.h1
      className="text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Line 1: "Transform Raw Content" */}
      <span className="block">
        {["Transform", "Raw", "Content"].map((word, i) => (
          <motion.span
            key={`l1-${i}`}
            variants={wordVariants}
            className="mr-[0.25em] inline-block text-gradient-landing"
          >
            {word}
          </motion.span>
        ))}
      </span>

      {/* Line 2: "Into Polished Videos" */}
      <span className="block">
        <motion.span
          variants={wordVariants}
          className="mr-[0.25em] inline-block text-gradient-landing"
        >
          Into
        </motion.span>
        {["Polished", "Videos"].map((word, i) => (
          <motion.span
            key={`l2-${i}`}
            variants={wordVariants}
            className="mr-[0.25em] inline-block hero-headline-accent hero-headline-shimmer"
          >
            {word}
          </motion.span>
        ))}
      </span>

      {/* Line 3: "with AI" */}
      <span className="block">
        <motion.span
          variants={wordVariants}
          className="mr-[0.25em] inline-block text-gradient-landing"
        >
          with
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="inline-block hero-headline-ai hero-headline-shimmer"
        >
          AI
        </motion.span>
      </span>
    </motion.h1>
  );
}
