"use client";

import { motion } from "framer-motion";
import {
  Download,
  Pencil,
  Image,
  Film,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

const stages = [
  { label: "Ingestion", icon: Download, status: "done" as const },
  { label: "Story Writing", icon: Pencil, status: "done" as const },
  { label: "Visual Gen", icon: Image, status: "active" as const },
  { label: "Assembly", icon: Film, status: "pending" as const },
];

export function FloatingCard() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-blue-500/20 blur-2xl" />

      {/* Main card */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl shadow-violet-500/10"
      >
        {/* Decorative gradient bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-amber-500" />

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">
              AI Content Pipeline
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Running
          </span>
        </div>

        {/* Pipeline stages */}
        <div className="mb-5 space-y-3">
          {stages.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  stage.status === "done"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : stage.status === "active"
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-white/5 text-white/30"
                }`}
              >
                {stage.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : stage.status === "active" ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <stage.icon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      stage.status === "pending"
                        ? "text-white/40"
                        : "text-white"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={`text-xs ${
                      stage.status === "done"
                        ? "text-emerald-400"
                        : stage.status === "active"
                          ? "text-violet-400"
                          : "text-white/30"
                    }`}
                  >
                    {stage.status === "done"
                      ? "Complete"
                      : stage.status === "active"
                        ? "Processing..."
                        : "Queued"}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className={`h-full rounded-full ${
                      stage.status === "done"
                        ? "bg-emerald-500"
                        : stage.status === "active"
                          ? "bg-violet-500"
                          : "bg-transparent"
                    }`}
                    initial={{ width: "0%" }}
                    animate={{
                      width:
                        stage.status === "done"
                          ? "100%"
                          : stage.status === "active"
                            ? "65%"
                            : "0%",
                    }}
                    transition={{ duration: 1.5, delay: i * 0.3 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="text-xs text-white/50">
            <span className="font-medium text-white/70">3 of 4</span> stages
            complete
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            ETA: 2 min
          </div>
        </div>
      </motion.div>

      {/* Small floating notification card - top right */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -top-4 -right-4 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:-right-12"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="whitespace-nowrap text-xs font-medium text-white/80">
            Video exported
          </span>
        </div>
      </motion.div>

      {/* Small floating notification card - bottom left */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -bottom-3 -left-4 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:-left-10"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/15">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <span className="whitespace-nowrap text-xs font-medium text-white/80">
            5+ AI providers
          </span>
        </div>
      </motion.div>
    </div>
  );
}
