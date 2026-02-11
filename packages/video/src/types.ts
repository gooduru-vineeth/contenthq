export interface VideoGenerationOptions {
  imageUrl: string;
  duration: number;
  motionSpec?: MotionSpec;
  outputFormat?: "mp4" | "webm";
  width?: number;
  height?: number;
  fps?: number;
}

export interface MotionSpec {
  type: "zoom" | "pan" | "kenburns" | "static";
  direction?: "in" | "out" | "left" | "right" | "up" | "down";
  speed?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface VideoResult {
  videoBuffer: Buffer;
  duration: number;
  format: string;
  width: number;
  height: number;
}

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

export interface AssemblyOptions {
  scenes: AssemblyScene[];
  outputFormat?: "mp4" | "webm";
  width?: number;
  height?: number;
  fps?: number;
}

export interface AssemblyScene {
  videoBuffer: Buffer;
  audioBuffer: Buffer;
  duration: number;
  transition?: "fade" | "cut" | "dissolve";
}

export interface AssemblyResult {
  videoBuffer: Buffer;
  duration: number;
  format: string;
  size: number;
}
