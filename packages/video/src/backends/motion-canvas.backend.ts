import type {
  RenderingBackend,
  SceneRenderInput,
  SceneRenderOutput,
  AssemblyInput,
  AssemblyOutput,
} from "./rendering-backend";

/**
 * Motion Canvas rendering backend (stub).
 * Requires @motion-canvas/core to be installed.
 */
export class MotionCanvasBackend implements RenderingBackend {
  readonly id = "motion-canvas";
  readonly name = "Motion Canvas";

  async renderScene(_input: SceneRenderInput): Promise<SceneRenderOutput> {
    throw new Error(
      "Motion Canvas backend not yet implemented. Install @motion-canvas/core to enable.",
    );
  }

  async assembleProject(_input: AssemblyInput): Promise<AssemblyOutput> {
    throw new Error(
      "Motion Canvas backend not yet implemented. Install @motion-canvas/core to enable.",
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      // @ts-expect-error -- optional dependency, not installed yet
      await import("@motion-canvas/core");
      return true;
    } catch {
      return false;
    }
  }
}
