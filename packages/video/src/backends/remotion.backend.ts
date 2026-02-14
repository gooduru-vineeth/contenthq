import type {
  RenderingBackend,
  SceneRenderInput,
  SceneRenderOutput,
  AssemblyInput,
  AssemblyOutput,
} from "./rendering-backend";

/**
 * Remotion rendering backend (stub).
 * Requires @remotion/renderer to be installed.
 */
export class RemotionBackend implements RenderingBackend {
  readonly id = "remotion";
  readonly name = "Remotion";

  async renderScene(_input: SceneRenderInput): Promise<SceneRenderOutput> {
    // TODO: Implement with @remotion/renderer when dependency is installed
    // Will use renderMedia() from @remotion/renderer
    throw new Error(
      "Remotion backend not yet implemented. Install @remotion/renderer to enable.",
    );
  }

  async assembleProject(_input: AssemblyInput): Promise<AssemblyOutput> {
    // TODO: Implement Remotion-based assembly
    // Remotion handles assembly differently - it renders the entire composition at once
    throw new Error(
      "Remotion backend not yet implemented. Install @remotion/renderer to enable.",
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      // @ts-expect-error -- optional dependency, not installed yet
      await import("@remotion/renderer");
      return true;
    } catch {
      return false;
    }
  }
}
