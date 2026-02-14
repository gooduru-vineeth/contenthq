import type { RenderingBackend } from "./rendering-backend";

export class RenderingBackendRegistry {
  private backends = new Map<string, RenderingBackend>();

  register(backend: RenderingBackend): void {
    this.backends.set(backend.id, backend);
  }

  get(id: string): RenderingBackend {
    const backend = this.backends.get(id);
    if (!backend) {
      throw new Error(
        `Rendering backend "${id}" not registered. Available: ${Array.from(this.backends.keys()).join(", ")}`,
      );
    }
    return backend;
  }

  has(id: string): boolean {
    return this.backends.has(id);
  }

  getAll(): RenderingBackend[] {
    return Array.from(this.backends.values());
  }

  async getAvailable(): Promise<string[]> {
    const available: string[] = [];
    for (const [id, backend] of this.backends) {
      if (await backend.isAvailable()) {
        available.push(id);
      }
    }
    return available;
  }
}

// Singleton instance
export const renderingBackendRegistry = new RenderingBackendRegistry();
