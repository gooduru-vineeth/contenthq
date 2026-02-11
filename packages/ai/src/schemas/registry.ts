import type { z } from "zod";

const schemaMap = new Map<string, z.ZodType>();

/**
 * Register a named Zod schema so agents can reference output schemas by name.
 */
export function registerSchema(name: string, schema: z.ZodType): void {
  schemaMap.set(name, schema);
}

/**
 * Retrieve a registered schema by name.
 */
export function getSchema(name: string): z.ZodType | undefined {
  return schemaMap.get(name);
}

/**
 * List all registered schema names.
 */
export function listSchemas(): string[] {
  return Array.from(schemaMap.keys());
}

/**
 * Check if a schema is registered.
 */
export function hasSchema(name: string): boolean {
  return schemaMap.has(name);
}
