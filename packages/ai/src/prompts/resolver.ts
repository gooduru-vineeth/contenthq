import { promptTemplates, personas, projectPromptConfigs } from "@contenthq/db";
import { eq, and, isNull } from "drizzle-orm";
import type { PromptType, Persona, ResolvedPromptConfig } from "@contenthq/shared";
import { composePrompt } from "./composer";

// Accept db as a parameter so workers and different contexts can pass their own instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export async function resolvePromptForStage(
  db: DrizzleDb,
  projectId: string,
  userId: string,
  promptType: PromptType,
  variables: Record<string, string>
): Promise<ResolvedPromptConfig> {
  // Step 1: Check for project-level prompt override
  const projectConfig = await db.query.projectPromptConfigs.findFirst({
    where: eq(projectPromptConfigs.projectId, projectId),
  });

  let template: { id: string; content: string; version: number } | null = null;

  const overrideTemplateId = projectConfig?.promptOverrides?.[promptType];
  if (overrideTemplateId) {
    const overrideTemplate = await db.query.promptTemplates.findFirst({
      where: eq(promptTemplates.id, overrideTemplateId),
    });
    if (overrideTemplate) {
      template = {
        id: overrideTemplate.id,
        content: overrideTemplate.content,
        version: overrideTemplate.version,
      };
    }
  }

  // Step 2: Fall back to user's active template for this type
  if (!template) {
    const userTemplate = await db.query.promptTemplates.findFirst({
      where: and(
        eq(promptTemplates.type, promptType),
        eq(promptTemplates.createdBy, userId),
        eq(promptTemplates.isActive, true)
      ),
    });
    if (userTemplate) {
      template = {
        id: userTemplate.id,
        content: userTemplate.content,
        version: userTemplate.version,
      };
    }
  }

  // Step 3: Fall back to admin's active template (createdBy IS NULL)
  if (!template) {
    const adminTemplate = await db.query.promptTemplates.findFirst({
      where: and(
        eq(promptTemplates.type, promptType),
        isNull(promptTemplates.createdBy),
        eq(promptTemplates.isActive, true)
      ),
    });
    if (adminTemplate) {
      template = {
        id: adminTemplate.id,
        content: adminTemplate.content,
        version: adminTemplate.version,
      };
    }
  }

  // Step 4: No template found - throw error
  if (!template) {
    throw new Error(
      `No prompt template found for type "${promptType}". An admin must create predefined prompts via the admin panel.`
    );
  }

  // Resolve persona fragments
  let resolvedPersonas: Persona[] = [];
  const personaSelections = projectConfig?.personaSelections;

  if (personaSelections && Object.keys(personaSelections).length > 0) {
    // Load selected personas from project config
    const personaIds = Object.values(personaSelections) as string[];
    const selectedPersonas = await Promise.all(
      personaIds.map((id: string) =>
        db.query.personas.findFirst({
          where: eq(personas.id, id),
        })
      )
    );
    resolvedPersonas = selectedPersonas.filter(
      (p: Persona | undefined): p is Persona => p != null
    );
  } else {
    // Load default personas (isDefault = true AND createdBy IS NULL)
    const defaults = await db.query.personas.findMany({
      where: and(
        eq(personas.isDefault, true),
        isNull(personas.createdBy)
      ),
    });
    resolvedPersonas = defaults as Persona[];
  }

  const personaFragments = resolvedPersonas.map((p) => p.promptFragment);

  const customVariables = projectConfig?.customVariables ?? {};

  const composedPrompt = composePrompt({
    template: template.content,
    variables,
    personaFragments: personaFragments.length > 0 ? personaFragments : undefined,
    customVariables: Object.keys(customVariables).length > 0 ? customVariables : undefined,
  });

  return {
    template,
    personas: resolvedPersonas,
    composedPrompt,
  };
}
