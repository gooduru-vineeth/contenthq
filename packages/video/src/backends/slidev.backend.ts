import type {
  RenderingBackend,
  SceneRenderInput,
  SceneRenderOutput,
  AssemblyInput,
  AssemblyOutput,
} from "./rendering-backend";

/**
 * Slidev rendering backend (stub).
 * Requires slidev and puppeteer to be installed.
 * Renders markdown slides to PNG via Puppeteer, then uses FFmpeg for video assembly.
 */
export class SlidevBackend implements RenderingBackend {
  readonly id = "slidev";
  readonly name = "Slidev";

  async renderScene(_input: SceneRenderInput): Promise<SceneRenderOutput> {
    // TODO: Port Slidev + Puppeteer rendering from ppt_app
    throw new Error(
      "Slidev backend not yet implemented. Install slidev and puppeteer to enable.",
    );
  }

  async assembleProject(_input: AssemblyInput): Promise<AssemblyOutput> {
    // Slidev renders slides to PNG, then uses FFmpeg for final assembly
    // Delegate assembly to FFmpegBackend
    throw new Error("Slidev backend not yet implemented.");
  }

  async isAvailable(): Promise<boolean> {
    try {
      // @ts-expect-error -- optional dependency, not installed yet
      await import("puppeteer");
      return true;
    } catch {
      return false;
    }
  }
}
