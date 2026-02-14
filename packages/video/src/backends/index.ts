export type {
  RenderingBackend,
  SceneRenderInput,
  SceneRenderOutput,
  AssemblyInput,
  AssemblyOutput,
} from "./rendering-backend";
export { FFmpegBackend } from "./ffmpeg.backend";
export { RemotionBackend } from "./remotion.backend";
export { MotionCanvasBackend } from "./motion-canvas.backend";
export { SlidevBackend } from "./slidev.backend";
export {
  RenderingBackendRegistry,
  renderingBackendRegistry,
} from "./backend-registry";
