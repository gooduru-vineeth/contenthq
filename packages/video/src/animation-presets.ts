import type { MotionType, TransitionType, MotionSpec, TransitionSpec, AnimationPreset } from "./types";

// ─── Random Selection Pools ─────────────────────────────────────────

/** Motion types suitable for system-random assignment (excludes static, pan_up, pan_down which are niche). */
export const RANDOM_MOTION_POOL: MotionType[] = [
  "zoom_in",
  "zoom_out",
  "pan_left",
  "pan_right",
  "kenburns_in",
  "kenburns_out",
];

/** Transition types suitable for system-random assignment (excludes jarring or niche ones). */
export const RANDOM_TRANSITION_POOL: TransitionType[] = [
  "fade",
  "fadeblack",
  "dissolve",
  "wipeleft",
  "wiperight",
  "slideleft",
  "slideright",
  "smoothleft",
  "smoothright",
];

// ─── Curated Animation Presets ──────────────────────────────────────

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // Gentle
  { id: "gentle-zoom-in", name: "Gentle Zoom In", category: "gentle", motion: { type: "zoom_in", speed: 0.3 }, transition: { type: "fade", duration: 0.8 } },
  { id: "gentle-zoom-out", name: "Gentle Zoom Out", category: "gentle", motion: { type: "zoom_out", speed: 0.3 }, transition: { type: "dissolve", duration: 0.8 } },
  { id: "gentle-pan", name: "Gentle Pan", category: "gentle", motion: { type: "pan_right", speed: 0.3 }, transition: { type: "fade", duration: 0.6 } },

  // Dynamic
  { id: "dynamic-kenburns", name: "Dynamic Ken Burns", category: "dynamic", motion: { type: "kenburns_in", speed: 0.6 }, transition: { type: "wipeleft", duration: 0.5 } },
  { id: "dynamic-pan-left", name: "Dynamic Pan Left", category: "dynamic", motion: { type: "pan_left", speed: 0.6 }, transition: { type: "slideleft", duration: 0.4 } },
  { id: "dynamic-zoom", name: "Dynamic Zoom", category: "dynamic", motion: { type: "zoom_in", speed: 0.7 }, transition: { type: "smoothleft", duration: 0.5 } },

  // Cinematic
  { id: "cinematic-kb-in", name: "Cinematic Ken Burns In", category: "cinematic", motion: { type: "kenburns_in", speed: 0.4 }, transition: { type: "fadeblack", duration: 1.0 } },
  { id: "cinematic-kb-out", name: "Cinematic Ken Burns Out", category: "cinematic", motion: { type: "kenburns_out", speed: 0.4 }, transition: { type: "fadeblack", duration: 1.0 } },
  { id: "cinematic-slow-zoom", name: "Cinematic Slow Zoom", category: "cinematic", motion: { type: "zoom_in", speed: 0.3 }, transition: { type: "dissolve", duration: 1.2 } },
  { id: "cinematic-pan-right", name: "Cinematic Pan Right", category: "cinematic", motion: { type: "pan_right", speed: 0.35 }, transition: { type: "fade", duration: 0.8 } },

  // Dramatic
  { id: "dramatic-zoom-in", name: "Dramatic Zoom In", category: "dramatic", motion: { type: "zoom_in", speed: 0.9 }, transition: { type: "fadeblack", duration: 0.3 } },
  { id: "dramatic-kb", name: "Dramatic Ken Burns", category: "dramatic", motion: { type: "kenburns_in", speed: 0.8 }, transition: { type: "circleopen", duration: 0.5 } },
  { id: "dramatic-wipe", name: "Dramatic Wipe", category: "dramatic", motion: { type: "pan_left", speed: 0.8 }, transition: { type: "wiperight", duration: 0.4 } },
];

// ─── Random Selection Functions ─────────────────────────────────────

/** Pick a random motion type, avoiding consecutive repeats. */
export function pickRandomMotion(previousMotion?: MotionType): MotionSpec {
  const pool = previousMotion
    ? RANDOM_MOTION_POOL.filter((m) => m !== previousMotion)
    : RANDOM_MOTION_POOL;
  const type = pool[Math.floor(Math.random() * pool.length)];
  // Randomize speed between 0.3 and 0.7 for variety
  const speed = Math.round((0.3 + Math.random() * 0.4) * 10) / 10;
  return { type, speed };
}

/** Pick a random transition type, avoiding consecutive repeats. */
export function pickRandomTransition(previousTransition?: TransitionType): TransitionSpec {
  const pool = previousTransition
    ? RANDOM_TRANSITION_POOL.filter((t) => t !== previousTransition)
    : RANDOM_TRANSITION_POOL;
  const type = pool[Math.floor(Math.random() * pool.length)];
  // Randomize duration between 0.3 and 0.8 seconds
  const duration = Math.round((0.3 + Math.random() * 0.5) * 10) / 10;
  return { type, duration };
}

// ─── AI Output Mapping ──────────────────────────────────────────────

const AI_TRANSITION_MAP: Record<string, TransitionType> = {
  // Direct matches
  fade: "fade",
  fadeblack: "fadeblack",
  fadewhite: "fadewhite",
  dissolve: "dissolve",
  wipeleft: "wipeleft",
  wiperight: "wiperight",
  slideleft: "slideleft",
  slideright: "slideright",
  circleopen: "circleopen",
  circleclose: "circleclose",
  radial: "radial",
  smoothleft: "smoothleft",
  smoothright: "smoothright",
  zoomin: "zoomin",
  none: "none",
  // Common AI output variations
  crossfade: "dissolve",
  cross_fade: "dissolve",
  cut: "none",
  wipe: "wipeleft",
  slide: "slideleft",
  "fade_to_black": "fadeblack",
  "fade_to_white": "fadewhite",
  "circle_open": "circleopen",
  "circle_close": "circleclose",
  "smooth_left": "smoothleft",
  "smooth_right": "smoothright",
  "zoom_in": "zoomin",
  "wipe_left": "wipeleft",
  "wipe_right": "wiperight",
  "slide_left": "slideleft",
  "slide_right": "slideright",
};

/** Map AI-output transition strings to TransitionType. Falls back to "fade". */
export function mapAiTransitionName(aiTransition: string): TransitionType {
  const normalized = aiTransition.toLowerCase().trim();
  return AI_TRANSITION_MAP[normalized] ?? "fade";
}

const AI_MOTION_MAP: Record<string, MotionType> = {
  // Direct matches
  zoom_in: "zoom_in",
  zoom_out: "zoom_out",
  pan_left: "pan_left",
  pan_right: "pan_right",
  pan_up: "pan_up",
  pan_down: "pan_down",
  kenburns_in: "kenburns_in",
  kenburns_out: "kenburns_out",
  static: "static",
  // Legacy / AI variations
  zoom: "zoom_in",
  ken_burns: "kenburns_in",
  kenburns: "kenburns_in",
  ken_burns_in: "kenburns_in",
  ken_burns_out: "kenburns_out",
  pan: "pan_right",
};

/** Map AI-output motion strings to MotionType. Falls back to "kenburns_in". */
export function mapAiMotionName(aiMotion: string): MotionType {
  const normalized = aiMotion.toLowerCase().trim();
  return AI_MOTION_MAP[normalized] ?? "kenburns_in";
}

/** Map legacy MotionSpec (type+direction) to new MotionType. */
export function mapLegacyMotionSpec(spec: { type?: string; direction?: string }): MotionType {
  if (!spec.type) return "kenburns_in";
  const t = spec.type.toLowerCase();
  const d = spec.direction?.toLowerCase();

  if (t === "zoom") return d === "out" ? "zoom_out" : "zoom_in";
  if (t === "pan") {
    if (d === "left") return "pan_left";
    if (d === "right") return "pan_right";
    if (d === "up") return "pan_up";
    if (d === "down") return "pan_down";
    return "pan_right";
  }
  if (t === "kenburns" || t === "ken_burns") return d === "out" ? "kenburns_out" : "kenburns_in";
  if (t === "static") return "static";

  // Try direct mapping for new-style types stored in legacy format
  return AI_MOTION_MAP[t] ?? "kenburns_in";
}
