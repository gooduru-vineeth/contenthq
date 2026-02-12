import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  promptTemplates,
  promptTemplateVersions,
  personas,
  personaVersions,
  projectPromptConfigs,
  projects,
} from "@contenthq/db/schema";
import { eq, and, isNull, or, desc } from "drizzle-orm";
import {
  createPromptTemplateSchema,
  updatePromptTemplateSchema,
  createPersonaSchema,
  updatePersonaSchema,
  updateProjectPromptConfigSchema,
  previewPromptSchema,
  templateVersionHistorySchema,
  getTemplateVersionSchema,
  revertTemplateSchema,
  personaVersionHistorySchema,
  getPersonaVersionSchema,
  revertPersonaSchema,
} from "@contenthq/shared";
import { composePrompt } from "@contenthq/ai";

const promptTypeEnum = z.enum([
  "story_writing",
  "scene_generation",
  "image_generation",
  "image_refinement",
  "visual_verification",
]);

const personaCategoryEnum = z.enum([
  "tone",
  "audience",
  "visual_style",
  "narrative_style",
]);

export const promptRouter = router({
  // === ADMIN ENDPOINTS ===
  admin: router({
    createTemplate: adminProcedure
      .input(createPromptTemplateSchema)
      .mutation(async ({ input }) => {
        return db.transaction(async (tx) => {
          // Deactivate existing admin templates of the same type
          await tx
            .update(promptTemplates)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(promptTemplates.type, input.type),
                isNull(promptTemplates.createdBy),
                eq(promptTemplates.isActive, true)
              )
            );

          const [template] = await tx
            .insert(promptTemplates)
            .values({
              type: input.type,
              name: input.name,
              content: input.content,
              description: input.description,
              variables: input.variables ?? [],
              outputSchemaHint: input.outputSchemaHint,
              version: 1,
              isActive: true,
              createdBy: null,
            })
            .returning();
          return template;
        });
      }),

    updateTemplate: adminProcedure
      .input(updatePromptTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, changeNote, ...data } = input;

        return db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(promptTemplates)
            .where(
              and(
                eq(promptTemplates.id, id),
                isNull(promptTemplates.createdBy)
              )
            );
          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Admin template not found",
            });
          }

          // Snapshot pre-edit state into history
          await tx.insert(promptTemplateVersions).values({
            templateId: existing.id,
            version: existing.version,
            type: existing.type,
            name: existing.name,
            description: existing.description,
            content: existing.content,
            variables: existing.variables,
            outputSchemaHint: existing.outputSchemaHint,
            editedBy: ctx.user.id,
            changeNote: changeNote ?? null,
          });

          const [updated] = await tx
            .update(promptTemplates)
            .set({
              ...data,
              version: existing.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(promptTemplates.id, id))
            .returning();
          return updated;
        });
      }),

    deleteTemplate: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const [existing] = await db
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, input.id),
              isNull(promptTemplates.createdBy)
            )
          );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin template not found",
          });
        }

        await db
          .delete(promptTemplates)
          .where(eq(promptTemplates.id, input.id));
        return { success: true };
      }),

    setActiveTemplate: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const [target] = await db
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, input.id),
              isNull(promptTemplates.createdBy)
            )
          );
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin template not found",
          });
        }

        return db.transaction(async (tx) => {
          await tx
            .update(promptTemplates)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(promptTemplates.type, target.type),
                isNull(promptTemplates.createdBy),
                eq(promptTemplates.isActive, true)
              )
            );

          const [updated] = await tx
            .update(promptTemplates)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(promptTemplates.id, input.id))
            .returning();
          return updated;
        });
      }),

    createPersona: adminProcedure
      .input(createPersonaSchema)
      .mutation(async ({ input }) => {
        return db.transaction(async (tx) => {
          if (input.isDefault) {
            await tx
              .update(personas)
              .set({ isDefault: false, updatedAt: new Date() })
              .where(
                and(
                  eq(personas.category, input.category),
                  isNull(personas.createdBy),
                  eq(personas.isDefault, true)
                )
              );
          }

          const [persona] = await tx
            .insert(personas)
            .values({
              category: input.category,
              name: input.name,
              label: input.label,
              promptFragment: input.promptFragment,
              description: input.description,
              isDefault: input.isDefault ?? false,
              uiConfig: input.uiConfig,
              version: 1,
              createdBy: null,
            })
            .returning();
          return persona;
        });
      }),

    updatePersona: adminProcedure
      .input(updatePersonaSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, changeNote, ...data } = input;

        return db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(personas)
            .where(
              and(eq(personas.id, id), isNull(personas.createdBy))
            );
          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Admin persona not found",
            });
          }

          // Snapshot pre-edit state into history
          await tx.insert(personaVersions).values({
            personaId: existing.id,
            version: existing.version,
            category: existing.category,
            name: existing.name,
            label: existing.label,
            description: existing.description,
            promptFragment: existing.promptFragment,
            uiConfig: existing.uiConfig,
            editedBy: ctx.user.id,
            changeNote: changeNote ?? null,
          });

          const [updated] = await tx
            .update(personas)
            .set({
              ...data,
              version: existing.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(personas.id, id))
            .returning();
          return updated;
        });
      }),

    deletePersona: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const [existing] = await db
          .select()
          .from(personas)
          .where(
            and(eq(personas.id, input.id), isNull(personas.createdBy))
          );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin persona not found",
          });
        }

        await db.delete(personas).where(eq(personas.id, input.id));
        return { success: true };
      }),

    setDefaultPersona: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const [target] = await db
          .select()
          .from(personas)
          .where(
            and(eq(personas.id, input.id), isNull(personas.createdBy))
          );
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin persona not found",
          });
        }

        return db.transaction(async (tx) => {
          await tx
            .update(personas)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(
              and(
                eq(personas.category, target.category),
                isNull(personas.createdBy),
                eq(personas.isDefault, true)
              )
            );

          const [updated] = await tx
            .update(personas)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(personas.id, input.id))
            .returning();
          return updated;
        });
      }),

    seedDefaults: adminProcedure.mutation(async () => {
      const { DEFAULT_PROMPT_TEMPLATES, DEFAULT_PERSONAS } = await import(
        "@contenthq/ai"
      );

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
            ...tmpl,
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

      return { templatesSeeded, personasSeeded };
    }),

    listAllTemplates: adminProcedure
      .input(z.object({ type: promptTypeEnum }).optional())
      .query(async ({ input }) => {
        const conditions = [isNull(promptTemplates.createdBy)];
        if (input?.type) {
          conditions.push(eq(promptTemplates.type, input.type));
        }
        return db
          .select()
          .from(promptTemplates)
          .where(and(...conditions))
          .orderBy(desc(promptTemplates.updatedAt));
      }),

    listAllPersonas: adminProcedure
      .input(z.object({ category: personaCategoryEnum }).optional())
      .query(async ({ input }) => {
        const conditions = [isNull(personas.createdBy)];
        if (input?.category) {
          conditions.push(eq(personas.category, input.category));
        }
        return db
          .select()
          .from(personas)
          .where(and(...conditions))
          .orderBy(desc(personas.updatedAt));
      }),

    // --- Version history admin endpoints ---

    getTemplateVersionHistory: adminProcedure
      .input(templateVersionHistorySchema)
      .query(async ({ input }) => {
        const [template] = await db
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, input.templateId),
              isNull(promptTemplates.createdBy)
            )
          );
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin template not found",
          });
        }

        const history = await db
          .select()
          .from(promptTemplateVersions)
          .where(eq(promptTemplateVersions.templateId, input.templateId))
          .orderBy(desc(promptTemplateVersions.version))
          .limit(input.limit)
          .offset(input.offset);

        return { current: template, history };
      }),

    getTemplateVersion: adminProcedure
      .input(getTemplateVersionSchema)
      .query(async ({ input }) => {
        const [version] = await db
          .select()
          .from(promptTemplateVersions)
          .where(
            and(
              eq(promptTemplateVersions.templateId, input.templateId),
              eq(promptTemplateVersions.version, input.version)
            )
          );
        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.version} not found for this template`,
          });
        }
        return version;
      }),

    revertTemplate: adminProcedure
      .input(revertTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        return db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(promptTemplates)
            .where(
              and(
                eq(promptTemplates.id, input.templateId),
                isNull(promptTemplates.createdBy)
              )
            );
          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Admin template not found",
            });
          }

          const [targetVersion] = await tx
            .select()
            .from(promptTemplateVersions)
            .where(
              and(
                eq(promptTemplateVersions.templateId, input.templateId),
                eq(promptTemplateVersions.version, input.targetVersion)
              )
            );
          if (!targetVersion) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Version ${input.targetVersion} not found`,
            });
          }

          // Snapshot current state before reverting
          await tx.insert(promptTemplateVersions).values({
            templateId: current.id,
            version: current.version,
            type: current.type,
            name: current.name,
            description: current.description,
            content: current.content,
            variables: current.variables,
            outputSchemaHint: current.outputSchemaHint,
            editedBy: ctx.user.id,
            changeNote: `Reverted to version ${input.targetVersion}`,
          });

          // Copy target version fields back to main table
          const [updated] = await tx
            .update(promptTemplates)
            .set({
              name: targetVersion.name,
              description: targetVersion.description,
              content: targetVersion.content,
              variables: targetVersion.variables,
              outputSchemaHint: targetVersion.outputSchemaHint,
              version: current.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(promptTemplates.id, input.templateId))
            .returning();
          return updated;
        });
      }),

    getPersonaVersionHistory: adminProcedure
      .input(personaVersionHistorySchema)
      .query(async ({ input }) => {
        const [persona] = await db
          .select()
          .from(personas)
          .where(
            and(
              eq(personas.id, input.personaId),
              isNull(personas.createdBy)
            )
          );
        if (!persona) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin persona not found",
          });
        }

        const history = await db
          .select()
          .from(personaVersions)
          .where(eq(personaVersions.personaId, input.personaId))
          .orderBy(desc(personaVersions.version))
          .limit(input.limit)
          .offset(input.offset);

        return { current: persona, history };
      }),

    getPersonaVersion: adminProcedure
      .input(getPersonaVersionSchema)
      .query(async ({ input }) => {
        const [version] = await db
          .select()
          .from(personaVersions)
          .where(
            and(
              eq(personaVersions.personaId, input.personaId),
              eq(personaVersions.version, input.version)
            )
          );
        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.version} not found for this persona`,
          });
        }
        return version;
      }),

    revertPersona: adminProcedure
      .input(revertPersonaSchema)
      .mutation(async ({ ctx, input }) => {
        return db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(personas)
            .where(
              and(
                eq(personas.id, input.personaId),
                isNull(personas.createdBy)
              )
            );
          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Admin persona not found",
            });
          }

          const [targetVersion] = await tx
            .select()
            .from(personaVersions)
            .where(
              and(
                eq(personaVersions.personaId, input.personaId),
                eq(personaVersions.version, input.targetVersion)
              )
            );
          if (!targetVersion) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Version ${input.targetVersion} not found`,
            });
          }

          // Snapshot current state before reverting
          await tx.insert(personaVersions).values({
            personaId: current.id,
            version: current.version,
            category: current.category,
            name: current.name,
            label: current.label,
            description: current.description,
            promptFragment: current.promptFragment,
            uiConfig: current.uiConfig,
            editedBy: ctx.user.id,
            changeNote: `Reverted to version ${input.targetVersion}`,
          });

          // Copy target version fields back to main table
          const [updated] = await tx
            .update(personas)
            .set({
              name: targetVersion.name,
              label: targetVersion.label,
              description: targetVersion.description,
              promptFragment: targetVersion.promptFragment,
              uiConfig: targetVersion.uiConfig,
              version: current.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(personas.id, input.personaId))
            .returning();
          return updated;
        });
      }),
  }),

  // === USER ENDPOINTS ===
  listTemplates: protectedProcedure
    .input(z.object({ type: promptTypeEnum }).optional())
    .query(async ({ ctx, input }) => {
      const ownerCondition = or(
        isNull(promptTemplates.createdBy),
        eq(promptTemplates.createdBy, ctx.user.id)
      );
      const conditions = [ownerCondition];
      if (input?.type) {
        conditions.push(eq(promptTemplates.type, input.type));
      }
      return db
        .select()
        .from(promptTemplates)
        .where(and(...conditions))
        .orderBy(desc(promptTemplates.updatedAt));
    }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [template] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.id, input.id),
            or(
              isNull(promptTemplates.createdBy),
              eq(promptTemplates.createdBy, ctx.user.id)
            )
          )
        );
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      return template;
    }),

  getActiveTemplate: protectedProcedure
    .input(z.object({ type: promptTypeEnum }))
    .query(async ({ ctx, input }) => {
      // First try user's active template
      const [userActive] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.type, input.type),
            eq(promptTemplates.createdBy, ctx.user.id),
            eq(promptTemplates.isActive, true)
          )
        )
        .limit(1);

      if (userActive) return userActive;

      // Fall back to admin active template
      const [adminActive] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.type, input.type),
            isNull(promptTemplates.createdBy),
            eq(promptTemplates.isActive, true)
          )
        )
        .limit(1);

      if (!adminActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No active template found for type: ${input.type}`,
        });
      }
      return adminActive;
    }),

  createTemplate: protectedProcedure
    .input(createPromptTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const [template] = await db
        .insert(promptTemplates)
        .values({
          type: input.type,
          name: input.name,
          content: input.content,
          description: input.description,
          variables: input.variables ?? [],
          outputSchemaHint: input.outputSchemaHint,
          version: 1,
          isActive: false,
          createdBy: ctx.user.id,
        })
        .returning();
      return template;
    }),

  updateTemplate: protectedProcedure
    .input(updatePromptTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, changeNote, ...data } = input;

      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, id),
              eq(promptTemplates.createdBy, ctx.user.id)
            )
          );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found or not owned by you",
          });
        }

        // Snapshot pre-edit state into history
        await tx.insert(promptTemplateVersions).values({
          templateId: existing.id,
          version: existing.version,
          type: existing.type,
          name: existing.name,
          description: existing.description,
          content: existing.content,
          variables: existing.variables,
          outputSchemaHint: existing.outputSchemaHint,
          editedBy: ctx.user.id,
          changeNote: changeNote ?? null,
        });

        const [updated] = await tx
          .update(promptTemplates)
          .set({
            ...data,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(promptTemplates.id, id))
          .returning();
        return updated;
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.id, input.id),
            eq(promptTemplates.createdBy, ctx.user.id)
          )
        );
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found or not owned by you",
        });
      }

      await db
        .delete(promptTemplates)
        .where(eq(promptTemplates.id, input.id));
      return { success: true };
    }),

  setActiveTemplate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.id, input.id),
            eq(promptTemplates.createdBy, ctx.user.id)
          )
        );
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found or not owned by you",
        });
      }

      return db.transaction(async (tx) => {
        await tx
          .update(promptTemplates)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(promptTemplates.type, target.type),
              eq(promptTemplates.createdBy, ctx.user.id),
              eq(promptTemplates.isActive, true)
            )
          );

        const [updated] = await tx
          .update(promptTemplates)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(promptTemplates.id, input.id))
          .returning();
        return updated;
      });
    }),

  // User version history endpoints
  getTemplateVersionHistory: protectedProcedure
    .input(templateVersionHistorySchema)
    .query(async ({ ctx, input }) => {
      const [template] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.id, input.templateId),
            eq(promptTemplates.createdBy, ctx.user.id)
          )
        );
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found or not owned by you",
        });
      }

      const history = await db
        .select()
        .from(promptTemplateVersions)
        .where(eq(promptTemplateVersions.templateId, input.templateId))
        .orderBy(desc(promptTemplateVersions.version))
        .limit(input.limit)
        .offset(input.offset);

      return { current: template, history };
    }),

  getTemplateVersion: protectedProcedure
    .input(getTemplateVersionSchema)
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const [template] = await db
        .select({ id: promptTemplates.id })
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.id, input.templateId),
            eq(promptTemplates.createdBy, ctx.user.id)
          )
        );
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found or not owned by you",
        });
      }

      const [version] = await db
        .select()
        .from(promptTemplateVersions)
        .where(
          and(
            eq(promptTemplateVersions.templateId, input.templateId),
            eq(promptTemplateVersions.version, input.version)
          )
        );
      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Version ${input.version} not found for this template`,
        });
      }
      return version;
    }),

  revertTemplate: protectedProcedure
    .input(revertTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, input.templateId),
              eq(promptTemplates.createdBy, ctx.user.id)
            )
          );
        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found or not owned by you",
          });
        }

        const [targetVersion] = await tx
          .select()
          .from(promptTemplateVersions)
          .where(
            and(
              eq(promptTemplateVersions.templateId, input.templateId),
              eq(promptTemplateVersions.version, input.targetVersion)
            )
          );
        if (!targetVersion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.targetVersion} not found`,
          });
        }

        // Snapshot current state before reverting
        await tx.insert(promptTemplateVersions).values({
          templateId: current.id,
          version: current.version,
          type: current.type,
          name: current.name,
          description: current.description,
          content: current.content,
          variables: current.variables,
          outputSchemaHint: current.outputSchemaHint,
          editedBy: ctx.user.id,
          changeNote: `Reverted to version ${input.targetVersion}`,
        });

        // Copy target version fields back to main table
        const [updated] = await tx
          .update(promptTemplates)
          .set({
            name: targetVersion.name,
            description: targetVersion.description,
            content: targetVersion.content,
            variables: targetVersion.variables,
            outputSchemaHint: targetVersion.outputSchemaHint,
            version: current.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(promptTemplates.id, input.templateId))
          .returning();
        return updated;
      });
    }),

  listPersonas: protectedProcedure
    .input(z.object({ category: personaCategoryEnum }).optional())
    .query(async ({ ctx, input }) => {
      const ownerCondition = or(
        isNull(personas.createdBy),
        eq(personas.createdBy, ctx.user.id)
      );
      const conditions = [ownerCondition];
      if (input?.category) {
        conditions.push(eq(personas.category, input.category));
      }
      return db
        .select()
        .from(personas)
        .where(and(...conditions))
        .orderBy(desc(personas.updatedAt));
    }),

  createPersona: protectedProcedure
    .input(createPersonaSchema)
    .mutation(async ({ ctx, input }) => {
      const [persona] = await db
        .insert(personas)
        .values({
          category: input.category,
          name: input.name,
          label: input.label,
          promptFragment: input.promptFragment,
          description: input.description,
          isDefault: input.isDefault ?? false,
          uiConfig: input.uiConfig,
          version: 1,
          createdBy: ctx.user.id,
        })
        .returning();
      return persona;
    }),

  updatePersona: protectedProcedure
    .input(updatePersonaSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, changeNote, ...data } = input;

      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(personas)
          .where(
            and(eq(personas.id, id), eq(personas.createdBy, ctx.user.id))
          );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Persona not found or not owned by you",
          });
        }

        // Snapshot pre-edit state into history
        await tx.insert(personaVersions).values({
          personaId: existing.id,
          version: existing.version,
          category: existing.category,
          name: existing.name,
          label: existing.label,
          description: existing.description,
          promptFragment: existing.promptFragment,
          uiConfig: existing.uiConfig,
          editedBy: ctx.user.id,
          changeNote: changeNote ?? null,
        });

        const [updated] = await tx
          .update(personas)
          .set({
            ...data,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(personas.id, id))
          .returning();
        return updated;
      });
    }),

  deletePersona: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(personas)
        .where(
          and(eq(personas.id, input.id), eq(personas.createdBy, ctx.user.id))
        );
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Persona not found or not owned by you",
        });
      }

      await db.delete(personas).where(eq(personas.id, input.id));
      return { success: true };
    }),

  // User persona version history endpoints
  getPersonaVersionHistory: protectedProcedure
    .input(personaVersionHistorySchema)
    .query(async ({ ctx, input }) => {
      const [persona] = await db
        .select()
        .from(personas)
        .where(
          and(
            eq(personas.id, input.personaId),
            eq(personas.createdBy, ctx.user.id)
          )
        );
      if (!persona) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Persona not found or not owned by you",
        });
      }

      const history = await db
        .select()
        .from(personaVersions)
        .where(eq(personaVersions.personaId, input.personaId))
        .orderBy(desc(personaVersions.version))
        .limit(input.limit)
        .offset(input.offset);

      return { current: persona, history };
    }),

  getPersonaVersion: protectedProcedure
    .input(getPersonaVersionSchema)
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const [persona] = await db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.id, input.personaId),
            eq(personas.createdBy, ctx.user.id)
          )
        );
      if (!persona) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Persona not found or not owned by you",
        });
      }

      const [version] = await db
        .select()
        .from(personaVersions)
        .where(
          and(
            eq(personaVersions.personaId, input.personaId),
            eq(personaVersions.version, input.version)
          )
        );
      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Version ${input.version} not found for this persona`,
        });
      }
      return version;
    }),

  revertPersona: protectedProcedure
    .input(revertPersonaSchema)
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(personas)
          .where(
            and(
              eq(personas.id, input.personaId),
              eq(personas.createdBy, ctx.user.id)
            )
          );
        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Persona not found or not owned by you",
          });
        }

        const [targetVersion] = await tx
          .select()
          .from(personaVersions)
          .where(
            and(
              eq(personaVersions.personaId, input.personaId),
              eq(personaVersions.version, input.targetVersion)
            )
          );
        if (!targetVersion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.targetVersion} not found`,
          });
        }

        // Snapshot current state before reverting
        await tx.insert(personaVersions).values({
          personaId: current.id,
          version: current.version,
          category: current.category,
          name: current.name,
          label: current.label,
          description: current.description,
          promptFragment: current.promptFragment,
          uiConfig: current.uiConfig,
          editedBy: ctx.user.id,
          changeNote: `Reverted to version ${input.targetVersion}`,
        });

        // Copy target version fields back to main table
        const [updated] = await tx
          .update(personas)
          .set({
            name: targetVersion.name,
            label: targetVersion.label,
            description: targetVersion.description,
            promptFragment: targetVersion.promptFragment,
            uiConfig: targetVersion.uiConfig,
            version: current.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(personas.id, input.personaId))
          .returning();
        return updated;
      });
    }),

  getProjectConfig: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const [existing] = await db
        .select()
        .from(projectPromptConfigs)
        .where(eq(projectPromptConfigs.projectId, input.projectId));

      if (existing) return existing;

      const [created] = await db
        .insert(projectPromptConfigs)
        .values({
          projectId: input.projectId,
          promptOverrides: {},
          personaSelections: {},
          customVariables: {},
        })
        .returning();
      return created;
    }),

  updateProjectConfig: protectedProcedure
    .input(updateProjectPromptConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const { projectId, ...data } = input;
      const [result] = await db
        .insert(projectPromptConfigs)
        .values({
          projectId,
          promptOverrides: data.promptOverrides ?? {},
          personaSelections: data.personaSelections ?? {},
          customVariables: data.customVariables ?? {},
        })
        .onConflictDoUpdate({
          target: projectPromptConfigs.projectId,
          set: {
            ...data,
            updatedAt: new Date(),
          },
        })
        .returning();
      return result;
    }),

  previewComposedPrompt: protectedProcedure
    .input(previewPromptSchema)
    .query(async ({ ctx, input }) => {
      let templateContent = input.templateContent;

      if (input.templateId) {
        const [template] = await db
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.id, input.templateId),
              or(
                isNull(promptTemplates.createdBy),
                eq(promptTemplates.createdBy, ctx.user.id)
              )
            )
          );
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }
        templateContent = template.content;
      }

      if (!templateContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either templateId or templateContent must be provided",
        });
      }

      let personaFragments: string[] = [];
      if (input.personaIds && input.personaIds.length > 0) {
        const loadedPersonas = await db
          .select()
          .from(personas)
          .where(
            and(
              or(
                isNull(personas.createdBy),
                eq(personas.createdBy, ctx.user.id)
              )
            )
          );

        personaFragments = loadedPersonas
          .filter((p) => input.personaIds!.includes(p.id))
          .map((p) => p.promptFragment);
      }

      const composed = composePrompt({
        template: templateContent,
        variables: input.variables ?? {},
        personaFragments,
      });

      return { composed };
    }),
});
