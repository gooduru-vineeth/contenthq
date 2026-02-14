/**
 * Seeds default prompt templates and personas into the database.
 * Run after db:push. Safe to run multiple times (skips existing admin templates/personas).
 *
 * Usage from repo root: pnpm run db:seed:prompts
 * Or as part of full seed: pnpm run db:seed
 */
import { db } from "@contenthq/db/client";
import { promptTemplates, personas } from "@contenthq/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_PROMPT_TEMPLATES, DEFAULT_PERSONAS } from "@contenthq/ai";

async function main() {
  console.warn("Seeding default prompt templates and personas...");

  let templatesSeeded = 0;
  let personasSeeded = 0;

  for (const tmpl of DEFAULT_PROMPT_TEMPLATES) {
    const [existing] = await db
      .select({ id: promptTemplates.id })
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.type, tmpl.type),
          isNull(promptTemplates.createdBy)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(promptTemplates).values({
        type: tmpl.type,
        name: tmpl.name,
        description: tmpl.description,
        content: tmpl.content,
        variables: tmpl.variables ?? [],
        createdBy: null,
        isActive: true,
        version: 1,
      });
      templatesSeeded++;
    }
  }

  for (const p of DEFAULT_PERSONAS) {
    const [existing] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.category, p.category),
          eq(personas.name, p.name),
          isNull(personas.createdBy)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(personas).values({
        ...p,
        createdBy: null,
      });
      personasSeeded++;
    }
  }

  console.warn(
    `  Prompt templates: ${templatesSeeded} new, ${DEFAULT_PROMPT_TEMPLATES.length - templatesSeeded} already present`
  );
  console.warn(
    `  Personas: ${personasSeeded} new, ${DEFAULT_PERSONAS.length - personasSeeded} already present`
  );
  console.warn("Prompt/persona seed completed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Prompt seed failed:", err);
  process.exit(1);
});
