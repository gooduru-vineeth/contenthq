import type { StageHandler } from "@contenthq/shared";

/**
 * Registry that maps stage IDs to their handler implementations.
 * Used by the GenericPipelineOrchestrator to dispatch stage execution.
 */
export class StageRegistry {
  private handlers = new Map<string, StageHandler>();

  register(handler: StageHandler): void {
    if (this.handlers.has(handler.stageId)) {
      console.warn(
        `[StageRegistry] Overwriting handler for stage "${handler.stageId}"`
      );
    }
    this.handlers.set(handler.stageId, handler);
  }

  get(stageId: string): StageHandler | undefined {
    return this.handlers.get(stageId);
  }

  getRequired(stageId: string): StageHandler {
    const handler = this.handlers.get(stageId);
    if (!handler) {
      throw new Error(
        `[StageRegistry] No handler registered for stage "${stageId}". ` +
          `Available: ${Array.from(this.handlers.keys()).join(", ")}`
      );
    }
    return handler;
  }

  has(stageId: string): boolean {
    return this.handlers.has(stageId);
  }

  getAll(): StageHandler[] {
    return Array.from(this.handlers.values());
  }

  getRegisteredStageIds(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton instance
export const stageRegistry = new StageRegistry();
