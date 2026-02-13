import { db } from "@contenthq/db/client";
import {
  generatedMedia,
  mediaConversations,
  mediaConversationMessages,
} from "@contenthq/db/schema";
import { eq, and, desc, like, count as countFn, sql } from "drizzle-orm";
import { addMediaGenerationJob } from "@contenthq/queue";
import { mediaProviderRegistry } from "@contenthq/ai";
import { storage } from "@contenthq/storage";
import type {
  MediaGenerationType,
  AspectRatio,
  MediaQuality,
  MediaGalleryFilters,
  ChatEditCombinationResult,
  ChatEditResponse,
} from "@contenthq/shared";

// ============================================
// RATE LIMITING
// In-memory per-user rate limiter: 20 requests/hour
// ============================================

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const rateLimitMap = new Map<
  string,
  { count: number; resetAt: number }
>();

function checkRateLimit(userId: string, requestCount = 1): void {
  const now = Date.now();

  // Clean up expired entries periodically
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, {
      count: requestCount,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (entry.count + requestCount > RATE_LIMIT_MAX) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    throw new Error(
      `Rate limit exceeded. You can generate up to ${RATE_LIMIT_MAX} media per hour. Try again in ${minutesLeft} minutes.`
    );
  }

  entry.count += requestCount;
}

// ============================================
// SERVICE METHODS
// ============================================

async function getAvailableModels(type?: MediaGenerationType) {
  return mediaProviderRegistry.getAvailableModels(type);
}

async function generate(
  userId: string,
  request: {
    prompt: string;
    mediaType: MediaGenerationType;
    model: string;
    aspectRatio?: AspectRatio;
    quality?: MediaQuality;
    style?: string;
    duration?: number;
    count?: number;
    referenceImageUrl?: string;
    conversationId?: string;
    projectId?: string;
  }
) {
  checkRateLimit(userId);

  // Validate model exists and provider is configured
  const provider = mediaProviderRegistry.getProviderForModel(request.model);
  if (!provider) {
    throw new Error(`Unknown model: ${request.model}`);
  }
  if (!provider.isConfigured()) {
    throw new Error(
      `Provider ${provider.name} is not configured. Check API key settings.`
    );
  }

  const aspectRatio = request.aspectRatio ?? "1:1";
  const quality = request.quality ?? "standard";
  const count = request.count ?? 1;

  // Create placeholder generatedMedia record
  const [record] = await db
    .insert(generatedMedia)
    .values({
      userId,
      prompt: request.prompt,
      mediaType: request.mediaType,
      model: request.model,
      provider: provider.provider,
      aspectRatio,
      quality,
      style: request.style ?? null,
      status: "pending",
      conversationId: request.conversationId ?? null,
      projectId: request.projectId ?? null,
    })
    .returning();

  // Queue the generation job
  const job = await addMediaGenerationJob({
    userId,
    generatedMediaId: record.id,
    prompt: request.prompt,
    mediaType: request.mediaType,
    model: request.model,
    provider: provider.provider,
    aspectRatio,
    quality,
    style: request.style,
    duration: request.duration,
    count,
    referenceImageUrl: request.referenceImageUrl,
    conversationId: request.conversationId,
    projectId: request.projectId,
  });

  // Auto-create conversation if none provided
  let conversationId = request.conversationId ?? null;
  if (!conversationId) {
    conversationId = await createConversationFromGeneration(
      userId,
      record.id,
      request.prompt,
      request.model,
      request.mediaType
    );
  } else {
    // Add messages to existing conversation
    const [msgCount] = await db
      .select({ total: countFn() })
      .from(mediaConversationMessages)
      .where(eq(mediaConversationMessages.conversationId, conversationId));
    const position = Number(msgCount?.total ?? 0);

    await db.insert(mediaConversationMessages).values([
      {
        conversationId,
        role: "user" as const,
        content: request.prompt,
        position,
      },
      {
        conversationId,
        role: "assistant" as const,
        content: request.prompt,
        generatedMediaId: record.id,
        model: request.model,
        position: position + 1,
      },
    ]);

    await db
      .update(mediaConversations)
      .set({
        messageCount: sql`${mediaConversations.messageCount} + 2`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mediaConversations.id, conversationId));
  }

  // Link generatedMedia to conversation
  if (conversationId) {
    await db
      .update(generatedMedia)
      .set({ conversationId })
      .where(eq(generatedMedia.id, record.id));
  }

  return { generatedMediaId: record.id, jobId: job.id, conversationId };
}

async function generateMultiModel(
  userId: string,
  request: {
    prompt: string;
    mediaType: MediaGenerationType;
    models: string[];
    aspectRatios?: AspectRatio[];
    qualities?: MediaQuality[];
    style?: string;
    count?: number;
    duration?: number;
    referenceImageUrl?: string;
    projectId?: string;
  }
) {
  const aspectRatios = request.aspectRatios ?? ["1:1"];
  const qualities = request.qualities ?? ["standard"];

  // Build Cartesian product: models x aspectRatios x qualities
  const combinations: Array<{
    model: string;
    aspectRatio: AspectRatio;
    quality: MediaQuality;
  }> = [];

  for (const model of request.models) {
    for (const aspectRatio of aspectRatios) {
      for (const quality of qualities) {
        combinations.push({ model, aspectRatio, quality });
      }
    }
  }

  // Rate limit check for the total number of combinations
  checkRateLimit(userId, combinations.length);

  // Create placeholder records and queue jobs in parallel
  const queuePromises = combinations.map(async (combo) => {
    const provider = mediaProviderRegistry.getProviderForModel(combo.model);
    if (!provider) {
      throw new Error(`Unknown model: ${combo.model}`);
    }

    const [record] = await db
      .insert(generatedMedia)
      .values({
        userId,
        prompt: request.prompt,
        mediaType: request.mediaType,
        model: combo.model,
        provider: provider.provider,
        aspectRatio: combo.aspectRatio,
        quality: combo.quality,
        style: request.style ?? null,
        status: "pending",
        projectId: request.projectId ?? null,
      })
      .returning();

    await addMediaGenerationJob({
      userId,
      generatedMediaId: record.id,
      prompt: request.prompt,
      mediaType: request.mediaType,
      model: combo.model,
      provider: provider.provider,
      aspectRatio: combo.aspectRatio,
      quality: combo.quality,
      style: request.style,
      duration: request.duration,
      count: request.count ?? 1,
      referenceImageUrl: request.referenceImageUrl,
      projectId: request.projectId,
    });

    return {
      generatedMediaId: record.id,
      modelId: combo.model,
      aspectRatio: combo.aspectRatio,
      quality: combo.quality,
    };
  });

  const settled = await Promise.allSettled(queuePromises);

  const results = settled
    .filter(
      (r): r is PromiseFulfilledResult<{
        generatedMediaId: string;
        modelId: string;
        aspectRatio: AspectRatio;
        quality: MediaQuality;
      }> => r.status === "fulfilled"
    )
    .map((r) => r.value);

  const errors = settled
    .filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    )
    .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

  if (errors.length > 0) {
    console.warn(
      `[MediaGeneration] ${errors.length} combinations failed to queue:`,
      errors
    );
  }

  return { results };
}

async function editMedia(
  userId: string,
  mediaId: string,
  request: {
    editPrompt: string;
    model?: string;
    strength?: number;
  }
) {
  // Validate ownership of source media
  const [sourceMedia] = await db
    .select()
    .from(generatedMedia)
    .where(and(eq(generatedMedia.id, mediaId), eq(generatedMedia.userId, userId)));

  if (!sourceMedia) {
    throw new Error("Media not found or access denied");
  }

  if (!sourceMedia.mediaUrl) {
    throw new Error("Source media has no URL available for editing");
  }

  const editModel = request.model ?? sourceMedia.model;
  const provider = mediaProviderRegistry.getProviderForModel(editModel);
  if (!provider) {
    throw new Error(`Unknown model: ${editModel}`);
  }

  checkRateLimit(userId);

  // Create placeholder record for the edit result
  const [record] = await db
    .insert(generatedMedia)
    .values({
      userId,
      prompt: request.editPrompt,
      mediaType: sourceMedia.mediaType,
      model: editModel,
      provider: provider.provider,
      aspectRatio: sourceMedia.aspectRatio,
      quality: sourceMedia.quality,
      status: "pending",
      conversationId: sourceMedia.conversationId,
      projectId: sourceMedia.projectId,
    })
    .returning();

  // Queue job with edit options
  const job = await addMediaGenerationJob({
    userId,
    generatedMediaId: record.id,
    prompt: request.editPrompt,
    mediaType: sourceMedia.mediaType as "image" | "video",
    model: editModel,
    provider: provider.provider,
    aspectRatio: sourceMedia.aspectRatio,
    quality: sourceMedia.quality,
    count: 1,
    editOptions: {
      sourceImageUrl: sourceMedia.mediaUrl,
      strength: request.strength,
    },
  });

  return { generatedMediaId: record.id, jobId: job.id };
}

async function listMedia(
  userId: string,
  filters: MediaGalleryFilters,
  page = 1,
  pageSize = 20
) {
  const conditions = [eq(generatedMedia.userId, userId)];

  if (filters.mediaType) {
    conditions.push(
      eq(
        generatedMedia.mediaType,
        filters.mediaType as "image" | "video"
      )
    );
  }

  if (filters.model) {
    conditions.push(eq(generatedMedia.model, filters.model));
  }

  if (filters.status) {
    conditions.push(
      eq(
        generatedMedia.status,
        filters.status as "pending" | "generating" | "completed" | "failed"
      )
    );
  }

  if (filters.search) {
    conditions.push(like(generatedMedia.prompt, `%${filters.search}%`));
  }

  const offset = (page - 1) * pageSize;

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(generatedMedia)
      .where(and(...conditions))
      .orderBy(desc(generatedMedia.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: countFn() })
      .from(generatedMedia)
      .where(and(...conditions)),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  return { items, total, page, pageSize, totalPages };
}

async function getMedia(userId: string, mediaId: string) {
  const [record] = await db
    .select()
    .from(generatedMedia)
    .where(
      and(eq(generatedMedia.id, mediaId), eq(generatedMedia.userId, userId))
    );

  if (!record) {
    throw new Error("Media not found or access denied");
  }

  return record;
}

async function deleteMedia(userId: string, mediaId: string) {
  const [record] = await db
    .select()
    .from(generatedMedia)
    .where(
      and(eq(generatedMedia.id, mediaId), eq(generatedMedia.userId, userId))
    );

  if (!record) {
    throw new Error("Media not found or access denied");
  }

  // Delete storage file if it exists
  if (record.storageKey) {
    try {
      await storage.deleteFile(record.storageKey);
    } catch (err) {
      console.warn(
        `[MediaGeneration] Failed to delete storage file ${record.storageKey}:`,
        err
      );
    }
  }

  // Delete DB record
  await db.delete(generatedMedia).where(eq(generatedMedia.id, mediaId));

  return { success: true };
}

async function createConversationFromGeneration(
  userId: string,
  generatedMediaId: string,
  prompt: string,
  model: string,
  mediaType: string
): Promise<string> {
  const title =
    prompt.length > 80 ? prompt.substring(0, 80) + "..." : prompt;

  const [conversation] = await db
    .insert(mediaConversations)
    .values({
      userId,
      title,
      initialPrompt: prompt,
      model,
      mediaType,
      messageCount: 2,
      lastMessageAt: new Date(),
    })
    .returning();

  // Create user message (position 0) and assistant message (position 1)
  await db.insert(mediaConversationMessages).values([
    {
      conversationId: conversation.id,
      role: "user" as const,
      content: prompt,
      position: 0,
    },
    {
      conversationId: conversation.id,
      role: "assistant" as const,
      content: prompt,
      generatedMediaId,
      model,
      position: 1,
    },
  ]);

  return conversation.id;
}

async function sendConversationMessage(
  userId: string,
  conversationId: string,
  request: {
    prompt: string;
    model?: string;
    mediaType?: MediaGenerationType;
    aspectRatio?: AspectRatio;
    quality?: MediaQuality;
    style?: string;
    duration?: number;
  }
) {
  // Verify conversation ownership
  const [conversation] = await db
    .select()
    .from(mediaConversations)
    .where(
      and(
        eq(mediaConversations.id, conversationId),
        eq(mediaConversations.userId, userId)
      )
    );

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  checkRateLimit(userId);

  // Build composite prompt from recent user messages
  const recentUserMessages = await db
    .select()
    .from(mediaConversationMessages)
    .where(
      and(
        eq(mediaConversationMessages.conversationId, conversationId),
        eq(mediaConversationMessages.role, "user")
      )
    )
    .orderBy(desc(mediaConversationMessages.position))
    .limit(4);

  // Build composite: oldest first, then new prompt
  const previousPrompts = recentUserMessages
    .reverse()
    .map((m) => m.content);

  let compositePrompt: string;
  if (previousPrompts.length === 0) {
    compositePrompt = request.prompt;
  } else {
    compositePrompt = previousPrompts[0]!;
    for (let i = 1; i < previousPrompts.length; i++) {
      compositePrompt += `. Additionally: ${previousPrompts[i]}`;
    }
    compositePrompt += `. Additionally: ${request.prompt}`;
  }

  const model = request.model ?? conversation.model;
  const mediaType =
    (request.mediaType as MediaGenerationType) ??
    (conversation.mediaType as MediaGenerationType) ??
    "image";

  const provider = mediaProviderRegistry.getProviderForModel(model);
  if (!provider) {
    throw new Error(`Unknown model: ${model}`);
  }
  if (!provider.isConfigured()) {
    throw new Error(
      `Provider ${provider.name} is not configured. Check API key settings.`
    );
  }

  const aspectRatio = request.aspectRatio ?? "1:1";
  const quality = request.quality ?? "standard";

  // Get current message count for positioning
  const [msgCount] = await db
    .select({ total: countFn() })
    .from(mediaConversationMessages)
    .where(eq(mediaConversationMessages.conversationId, conversationId));
  const position = Number(msgCount?.total ?? 0);

  // Create pending generatedMedia record
  const [record] = await db
    .insert(generatedMedia)
    .values({
      userId,
      prompt: compositePrompt,
      mediaType,
      model,
      provider: provider.provider,
      aspectRatio,
      quality,
      style: request.style ?? null,
      status: "pending",
      conversationId,
    })
    .returning();

  // Create user + assistant messages
  await db.insert(mediaConversationMessages).values([
    {
      conversationId,
      role: "user" as const,
      content: request.prompt,
      position,
    },
    {
      conversationId,
      role: "assistant" as const,
      content: compositePrompt,
      generatedMediaId: record.id,
      model,
      position: position + 1,
    },
  ]);

  // Update conversation metadata
  await db
    .update(mediaConversations)
    .set({
      messageCount: sql`${mediaConversations.messageCount} + 2`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mediaConversations.id, conversationId));

  // Queue the generation job
  const job = await addMediaGenerationJob({
    userId,
    generatedMediaId: record.id,
    prompt: compositePrompt,
    mediaType,
    model,
    provider: provider.provider,
    aspectRatio,
    quality,
    style: request.style,
    duration: request.duration,
    count: 1,
    conversationId,
  });

  return { generatedMediaId: record.id, jobId: job.id };
}

async function updateConversation(
  userId: string,
  conversationId: string,
  updates: { title?: string }
) {
  const [conversation] = await db
    .select()
    .from(mediaConversations)
    .where(
      and(
        eq(mediaConversations.id, conversationId),
        eq(mediaConversations.userId, userId)
      )
    );

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  const setClause: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.title !== undefined) {
    setClause.title = updates.title;
  }

  await db
    .update(mediaConversations)
    .set(setClause)
    .where(eq(mediaConversations.id, conversationId));

  return { success: true };
}

async function getConversation(userId: string, conversationId: string) {
  // Fetch the conversation with ownership check
  const [conversation] = await db
    .select()
    .from(mediaConversations)
    .where(
      and(
        eq(mediaConversations.id, conversationId),
        eq(mediaConversations.userId, userId)
      )
    );

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // Fetch messages ordered by position
  const messages = await db
    .select()
    .from(mediaConversationMessages)
    .where(eq(mediaConversationMessages.conversationId, conversationId))
    .orderBy(mediaConversationMessages.position);

  // For assistant messages, include linked generatedMedia
  const messagesWithMedia = await Promise.all(
    messages.map(async (msg) => {
      if (msg.role === "assistant" && msg.generatedMediaId) {
        const [media] = await db
          .select()
          .from(generatedMedia)
          .where(eq(generatedMedia.id, msg.generatedMediaId));
        return { ...msg, generatedMedia: media ?? null };
      }
      return { ...msg, generatedMedia: null };
    })
  );

  return { ...conversation, messages: messagesWithMedia };
}

async function listConversations(userId: string) {
  return db
    .select()
    .from(mediaConversations)
    .where(eq(mediaConversations.userId, userId))
    .orderBy(desc(mediaConversations.updatedAt));
}

async function deleteConversation(userId: string, conversationId: string) {
  // Verify ownership
  const [conversation] = await db
    .select()
    .from(mediaConversations)
    .where(
      and(
        eq(mediaConversations.id, conversationId),
        eq(mediaConversations.userId, userId)
      )
    );

  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // Find all generated media associated with this conversation
  const associatedMedia = await db
    .select()
    .from(generatedMedia)
    .where(eq(generatedMedia.conversationId, conversationId));

  // Delete storage files for associated media
  const deletePromises = associatedMedia
    .filter((m) => m.storageKey)
    .map(async (m) => {
      try {
        await storage.deleteFile(m.storageKey!);
      } catch (err) {
        console.warn(
          `[MediaGeneration] Failed to delete storage file ${m.storageKey}:`,
          err
        );
      }
    });

  await Promise.all(deletePromises);

  // Delete associated generatedMedia records
  if (associatedMedia.length > 0) {
    await db
      .delete(generatedMedia)
      .where(eq(generatedMedia.conversationId, conversationId));
  }

  // Delete conversation (cascade deletes messages)
  await db
    .delete(mediaConversations)
    .where(eq(mediaConversations.id, conversationId));

  return { success: true };
}

function getEditableModels() {
  return mediaProviderRegistry.getEditableModels();
}

async function chatEditMultiCombination(
  userId: string,
  sourceMediaId: string,
  request: {
    editPrompt: string;
    models: string[];
    aspectRatios: AspectRatio[];
    qualities: MediaQuality[];
    strength?: number;
    referenceImageUrl?: string;
    conversationId?: string;
  }
): Promise<ChatEditResponse> {
  // Validate source media ownership
  const [sourceMedia] = await db
    .select()
    .from(generatedMedia)
    .where(
      and(eq(generatedMedia.id, sourceMediaId), eq(generatedMedia.userId, userId))
    );

  if (!sourceMedia) {
    throw new Error("Media not found or access denied");
  }

  if (!sourceMedia.mediaUrl) {
    throw new Error("Source media has no URL available for editing");
  }

  // Build Cartesian product: models x aspectRatios x qualities
  const combinations: Array<{
    model: string;
    aspectRatio: AspectRatio;
    quality: MediaQuality;
  }> = [];

  for (const model of request.models) {
    for (const aspectRatio of request.aspectRatios) {
      for (const quality of request.qualities) {
        combinations.push({ model, aspectRatio, quality });
      }
    }
  }

  // Rate limit check
  checkRateLimit(userId, combinations.length);

  // Create or reuse conversation
  let conversationId = request.conversationId ?? null;
  if (!conversationId) {
    const title =
      request.editPrompt.length > 80
        ? request.editPrompt.substring(0, 80) + "..."
        : request.editPrompt;

    const [conversation] = await db
      .insert(mediaConversations)
      .values({
        userId,
        title,
        initialPrompt: request.editPrompt,
        model: request.models[0] ?? "unknown",
        mediaType: "image",
        messageCount: 0,
        lastMessageAt: new Date(),
      })
      .returning();
    conversationId = conversation.id;
  }

  // Save user message
  const [msgCount] = await db
    .select({ total: countFn() })
    .from(mediaConversationMessages)
    .where(eq(mediaConversationMessages.conversationId, conversationId));
  const position = Number(msgCount?.total ?? 0);

  await db.insert(mediaConversationMessages).values({
    conversationId,
    role: "user" as const,
    content: request.editPrompt,
    position,
  });

  // Process all combinations synchronously via Promise.allSettled
  const editPromises = combinations.map(async (combo) => {
    const startTime = Date.now();
    const provider = mediaProviderRegistry.getProviderForModel(combo.model);
    if (!provider) {
      throw new Error(`No provider found for model: ${combo.model}`);
    }
    if (!provider.editImage) {
      throw new Error(`Provider ${provider.name} does not support editing`);
    }

    const modelConfig = provider.getModels().find((m) => m.id === combo.model);
    const modelName = modelConfig?.name ?? combo.model;

    const result = await provider.editImage({
      image: sourceMedia.mediaUrl!,
      prompt: request.editPrompt,
      model: combo.model,
      strength: request.strength,
      count: 1,
      referenceImage: request.referenceImageUrl,
    });

    const generationTimeMs = Date.now() - startTime;

    // Upload result to R2
    if (!result.images || result.images.length === 0) {
      throw new Error("No image returned from provider");
    }

    const imageData = result.images[0]!;
    const ext = imageData.mediaType === "image/webp" ? "webp" : "png";
    const uuid = crypto.randomUUID();
    const storageKey = `generated-media/${userId}/${uuid}.${ext}`;
    const buffer = Buffer.from(imageData.base64, "base64");

    const uploadResult = await storage.uploadFileWithRetry(
      storageKey,
      new Uint8Array(buffer),
      imageData.mediaType
    );

    // Insert generated_media record
    const [record] = await db
      .insert(generatedMedia)
      .values({
        userId,
        prompt: request.editPrompt,
        mediaType: "image",
        model: combo.model,
        provider: provider.provider,
        aspectRatio: combo.aspectRatio,
        quality: combo.quality,
        status: "completed",
        mediaUrl: uploadResult.url,
        storageKey,
        generationTimeMs,
        conversationId,
        mimeType: imageData.mediaType,
      })
      .returning();

    // Save assistant message
    const [currentCount] = await db
      .select({ total: countFn() })
      .from(mediaConversationMessages)
      .where(eq(mediaConversationMessages.conversationId, conversationId!));
    const assistantPosition = Number(currentCount?.total ?? 0);

    await db.insert(mediaConversationMessages).values({
      conversationId: conversationId!,
      role: "assistant" as const,
      content: request.editPrompt,
      generatedMediaId: record.id,
      model: combo.model,
      position: assistantPosition,
    });

    return {
      modelId: combo.model,
      modelName,
      provider: provider.provider,
      aspectRatio: combo.aspectRatio,
      quality: combo.quality,
      status: "completed" as const,
      generatedMediaId: record.id,
      mediaUrl: uploadResult.url,
      generationTimeMs,
    } satisfies ChatEditCombinationResult;
  });

  const settled = await Promise.allSettled(editPromises);

  const results: ChatEditCombinationResult[] = settled.map((result, i) => {
    const combo = combinations[i]!;
    if (result.status === "fulfilled") {
      return result.value;
    }
    const provider = mediaProviderRegistry.getProviderForModel(combo.model);
    const modelConfig = provider?.getModels().find((m) => m.id === combo.model);
    return {
      modelId: combo.model,
      modelName: modelConfig?.name ?? combo.model,
      provider: provider?.provider ?? "unknown",
      aspectRatio: combo.aspectRatio,
      quality: combo.quality,
      status: "failed" as const,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  });

  const succeeded = results.filter((r) => r.status === "completed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  // Update conversation metadata
  await db
    .update(mediaConversations)
    .set({
      messageCount: sql`${mediaConversations.messageCount} + ${1 + succeeded}`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(mediaConversations.id, conversationId));

  return {
    results,
    conversationId,
    summary: {
      totalCombinations: combinations.length,
      succeeded,
      failed,
    },
  };
}

export const mediaGenerationService = {
  getAvailableModels,
  getEditableModels,
  generate,
  generateMultiModel,
  editMedia,
  chatEditMultiCombination,
  listMedia,
  getMedia,
  deleteMedia,
  createConversationFromGeneration,
  sendConversationMessage,
  updateConversation,
  getConversation,
  listConversations,
  deleteConversation,
};
