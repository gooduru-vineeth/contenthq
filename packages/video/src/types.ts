// ─── Motion Types ───────────────────────────────────────────────────

export type MotionType =
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "pan_up"
  | "pan_down"
  | "kenburns_in"
  | "kenburns_out"
  | "static";

export interface MotionSpec {
  type: MotionType;
  speed?: number; // 0.1 (subtle) to 1.0 (dramatic), default 0.5
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

// ─── Transition Types ───────────────────────────────────────────────

export type TransitionType =
  | "fade"
  | "fadeblack"
  | "fadewhite"
  | "dissolve"
  | "wipeleft"
  | "wiperight"
  | "slideleft"
  | "slideright"
  | "circleopen"
  | "circleclose"
  | "radial"
  | "smoothleft"
  | "smoothright"
  | "zoomin"
  | "none";

export interface TransitionSpec {
  type: TransitionType;
  duration?: number; // seconds, default 0.5
}

// ─── Animation Presets ──────────────────────────────────────────────

export interface AnimationPreset {
  id: string;
  name: string;
  category: "gentle" | "dynamic" | "cinematic" | "dramatic";
  motion: MotionSpec;
  transition: TransitionSpec;
}

// ─── Video Generation ───────────────────────────────────────────────

export interface VideoGenerationOptions {
  imageUrl: string;
  duration: number;
  motionSpec?: MotionSpec;
  outputFormat?: "mp4" | "webm";
  width?: number;
  height?: number;
  fps?: number;
}

export interface VideoResult {
  videoBuffer: Buffer;
  duration: number;
  format: string;
  width: number;
  height: number;
}

// ─── Audio ──────────────────────────────────────────────────────────

export interface AudioMixOptions {
  voiceoverBuffer: Buffer;
  musicBuffer?: Buffer;
  voiceoverVolume?: number;
  musicVolume?: number;
  musicDuckingEnabled?: boolean;
  outputFormat?: "mp3" | "wav";
}

export interface AudioMixResult {
  audioBuffer: Buffer;
  duration: number;
  format: string;
}

// ─── Assembly ───────────────────────────────────────────────────────

export interface AssemblyOptions {
  scenes: AssemblyScene[];
  defaultTransition?: TransitionSpec;
  outputFormat?: "mp4" | "webm";
  width?: number;
  height?: number;
  fps?: number;
}

export interface AssemblyScene {
  videoBuffer: Buffer;
  audioBuffer: Buffer;
  duration: number;
  transition?: TransitionSpec;
}

export interface AssemblyResult {
  videoBuffer: Buffer;
  duration: number;
  format: string;
  size: number;
}
