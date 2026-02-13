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
      className="text-4xl font-black tracking-tight leading-[1.12] sm:text-5xl md:text-6xl lg:text-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Line 1: "Transform Raw Content" */}
      <span className="block">
        <motion.span
          variants={wordVariants}
          className="mr-[0.22em] inline-block hero-word-transform"
        >
          Transform
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="mr-[0.22em] inline-block hero-word-raw"
        >
          Raw
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="inline-block hero-word-content"
        >
          Content
        </motion.span>
      </span>

      {/* Line 2: "Into Polished Videos" */}
      <span className="block mt-1">
        <motion.span
          variants={wordVariants}
          className="mr-[0.22em] inline-block hero-word-into"
        >
          Into
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="mr-[0.22em] inline-block hero-word-polished hero-headline-shimmer"
        >
          Polished
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="inline-block hero-word-videos hero-headline-shimmer"
        >
          Videos
        </motion.span>
      </span>

      {/* Line 3: "with AI" */}
      <span className="block mt-1">
        <motion.span
          variants={wordVariants}
          className="mr-[0.22em] inline-block hero-word-with"
        >
          with
        </motion.span>
        <motion.span
          variants={wordVariants}
          className="inline-block hero-word-ai hero-headline-shimmer"
        >
          AI
        </motion.span>
      </span>
    </motion.h1>
  );
}
