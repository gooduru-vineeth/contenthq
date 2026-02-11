# ContentHQ: Technical Execution Plan

## Context

ContentHQ is an existing Turborepo monorepo (Next.js 15, Hono + tRPC, Drizzle ORM, better-auth) with only foundational auth and a health-check endpoint. The goal is to build a full AI video creation pipeline: **give a topic, get a polished video**. The PRD defines a 7-stage pipeline (Ingestion -> Story Writing -> Scene Generation -> Visual Verification -> Video Generation -> Audio Layering -> Final Assembly) requiring 7 new packages, ~20 DB tables, 11 tRPC routers, 9 BullMQ workers, and ~15 frontend pages.

**Existing state**: 4 better-auth DB tables, 1 tRPC router (health), login/register pages, 24 shadcn components, Docker with PostgreSQL.

**Reference code to port from**:
- `ppt_app/`: BullMQ queue config, TTS provider registry, R2 storage service, worker patterns
- `social_intelligence/`: Content extraction adapters, service-repository pattern
- `ai_video/`: Zustand+Immer stores, scene/element types, FFmpeg rendering
- `ai/ai-platform/`: Multi-model provider abstraction

---

## Phase 0: Foundation Infrastructure

**Goal**: Create all shared packages, database schema, and infrastructure that every subsequent phase depends on.

**Agent team**: 1 lead + up to 5 parallel teammates

### Parallel Group A (no dependencies, all start immediately)

#### Task 0.1 — Create `packages/shared` [Size: M] [Agent: shared-pkg]
Shared types, Zod schemas, constants used by every other package.

Files to create:
- `packages/shared/package.json` (deps: `zod`)
- `packages/shared/tsconfig.json` (extends `@contenthq/typescript-config/node.json`)
- `packages/shared/src/index.ts`
- `packages/shared/src/types/pipeline.ts` — Pipeline stage enum, project status, job status, scene status enums
- `packages/shared/src/types/project.ts` — Project, Story, Scene TS types
- `packages/shared/src/types/ai.ts` — AIProvider, AIModel, Generation types
- `packages/shared/src/types/media.ts` — MediaAsset, MusicTrack, VoiceProfile types
- `packages/shared/src/types/billing.ts` — CreditBalance, CreditTransaction types
- `packages/shared/src/schemas/project.schema.ts` — Zod schemas for project CRUD
- `packages/shared/src/schemas/scene.schema.ts` — Zod schemas for scene data
- `packages/shared/src/schemas/pipeline.schema.ts` — Zod schemas for pipeline config
- `packages/shared/src/constants/credits.ts` — Credit costs per operation
- `packages/shared/src/constants/pipeline.ts` — Stage names, retry limits, defaults

**Reference**: PPT App `packages/shared/src/`

#### Task 0.2 — Extend `packages/db` with ~20 tables [Size: L] [Agent: db-schema]
New schema files in `packages/db/src/schema/`, following existing pattern (`pgTable`, `text` IDs for user refs, timestamps).

New schema files to create:
1. `projects.ts` — userId, title, status enum, inputType, inputContent, aspectRatio, targetDuration, tone, language, voiceProfileId, musicTrackId, finalVideoUrl, thumbnailUrl, progressPercent, totalCreditsUsed
2. `stories.ts` — projectId FK, title, hook, synopsis, narrativeArc (jsonb), sceneCount, version, aiModelUsed
3. `scenes.ts` — storyId FK, projectId FK, index, status enum, visualDescription, imagePrompt, narrationScript, motionSpec (jsonb), transitions, durations
4. `scene-visuals.ts` — sceneId FK, imageUrl, storageKey, prompt, verified, verificationScore, verificationDetails (jsonb), retryCount
5. `scene-videos.ts` — sceneId FK, videoUrl, storageKey, duration, voiceoverUrl, ttsProvider, ttsVoiceId
6. `scene-audio-mixes.ts` — sceneId FK, mixedAudioUrl, voiceoverVolume, musicVolume, musicDuckingEnabled
7. `ingested-content.ts` — projectId FK, sourceUrl, sourcePlatform, title, body, summary, engagementScore
8. `ai-providers.ts` — name, slug, type enum, isEnabled, rateLimitPerMinute, costPerUnit, config (jsonb)
9. `ai-models.ts` — providerId FK, name, modelId, type, isDefault, costs, capabilities (jsonb)
10. `ai-generations.ts` — userId, projectId, providerId, modelId, type, input/output (jsonb), tokens, costUsd, latencyMs
11. `generation-jobs.ts` — userId, projectId, jobType, status enum, priority, config (jsonb), result (jsonb), progressPercent
12. `media-assets.ts` — userId, projectId, type enum, url, storageKey, mimeType, sizeBytes, dimensions
13. `music-tracks.ts` — name, category, mood, bpm, duration, url, storageKey, source
14. `voice-profiles.ts` — name, provider, voiceId, language, gender, previewUrl, config (jsonb)
15. `credit-balances.ts` — userId (unique), balance, lastUpdated
16. `credit-transactions.ts` — userId, type enum, amount, description, jobId
17. `subscription-plans.ts` — name, monthlyCredits, price, limits (jsonb)
18. `subscriptions.ts` — userId, planId, status, currentPeriodEnd
19. `enums.ts` — All pgEnum definitions (project_status, scene_status, job_status, ai_provider_type, media_type)
20. Update `schema/index.ts` — re-export all new tables

**Important**: Use `text` for IDs referencing `user.id` (matches better-auth). Use `text` with nanoid for new entity PKs (matches existing pattern).

#### Task 0.4 — Create `packages/storage` (R2/S3) [Size: M] [Agent: storage-pkg]
Cloudflare R2 storage service using AWS SDK v3.

Files to create:
- `packages/storage/package.json` (deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- `packages/storage/tsconfig.json`
- `packages/storage/src/index.ts`
- `packages/storage/src/client.ts` — Lazy S3Client init with R2 endpoint
- `packages/storage/src/service.ts` — `uploadFile()`, `downloadFile()`, `deleteFile()`, `getSignedUrl()`, `getPublicUrl()`, `listFiles()`, `deleteDirectory()`
- `packages/storage/src/paths.ts` — Path builders: `users/{userId}/projects/{projectId}/scenes/{sceneId}/{type}/{filename}`
- `packages/storage/src/types.ts` — UploadResult, StorageOptions interfaces

**Reference**: `ppt_app/packages/database/src/storage.ts`

#### Task 0.6 — Dashboard Layout & Navigation Shell [Size: M] [Agent: web-layout]
Frontend layout shell for all dashboard pages.

Files to create:
- `apps/web/src/components/layout/sidebar.tsx` — Navigation sidebar (Dashboard, Projects, Media, Music, Voices, Billing, Settings)
- `apps/web/src/components/layout/header.tsx` — Top header with user avatar
- `apps/web/src/components/layout/app-layout.tsx` — Layout wrapper (sidebar + header + content)
- `apps/web/src/app/(dashboard)/layout.tsx` — Route group layout using AppLayout
- `apps/web/src/app/(dashboard)/page.tsx` — Dashboard home
- `apps/web/src/lib/navigation.ts` — Routes config

### Sequential Group B (depends on 0.1)

#### Task 0.3 — Create `packages/queue` (BullMQ + Redis) [Size: M] [Agent: queue-pkg]
**Blocked by**: Task 0.1 (needs shared types for job enums)

Files to create:
- `packages/queue/package.json` (deps: `bullmq`, `ioredis`, `@contenthq/shared`)
- `packages/queue/tsconfig.json`
- `packages/queue/src/index.ts`
- `packages/queue/src/connection.ts` — Redis connection config (parse REDIS_URL, connection pooling)
- `packages/queue/src/queues.ts` — Define 9 queues: INGESTION, STORY_WRITING, SCENE_GENERATION, VISUAL_GENERATION, VISUAL_VERIFICATION, VIDEO_GENERATION, TTS_GENERATION, AUDIO_MIXING, VIDEO_ASSEMBLY
- `packages/queue/src/types.ts` — Job data interfaces for each queue
- `packages/queue/src/helpers.ts` — `addJob()` helpers per queue, `getQueueStats()`
- `packages/queue/src/events.ts` — QueueEvents listeners

Infrastructure updates:
- Add Redis to `docker-compose.yml` (redis:7-alpine, port 6379)
- Add `REDIS_URL=redis://localhost:6379` to `.env.example`

**Reference**: `ppt_app/apps/api/src/config/queue.ts`

### Sequential Group C (depends on 0.3)

#### Task 0.5 — API Infrastructure (workers bootstrap, env) [Size: M] [Agent: api-infra]
**Blocked by**: Task 0.3 (needs queue package)

Files to modify/create:
- Update `apps/api/package.json` — add deps: `@contenthq/shared`, `@contenthq/queue`, `@contenthq/storage`
- Update `apps/api/src/lib/env.ts` — add REDIS_URL, R2 env vars, AI API key vars
- Create `apps/api/src/workers/index.ts` — Worker initialization (lazy import pattern)
- Update `apps/api/src/index.ts` — worker init on startup, graceful shutdown handler
- Update `.env.example` — all new env vars (REDIS_URL, CLOUDFLARE_*, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)

### Phase 0 Dependency Graph
```
0.1 (shared) ──> 0.3 (queue) ──> 0.5 (api-infra)
0.2 (db-schema)  ─┐
0.4 (storage)     ├─> Phase 1 starts when all complete
0.6 (web-layout)  ─┘
```

### Phase 0 Verification
- `pnpm install` succeeds
- `pnpm build` succeeds (all packages)
- `pnpm typecheck` passes
- `pnpm db:push` creates all new tables
- `pnpm docker:up` starts PostgreSQL + Redis
- Dashboard layout renders after login

---

## Phase 1: Ingestion + Story Writing

**Goal**: Users can create projects, ingest content from URLs, and generate AI stories.

**Agent team**: 1 lead + up to 4 parallel teammates

### Parallel Group A (all start together)

#### Task 1.1 — Project, Ingestion, Story, Job tRPC Routers [Size: M] [Agent: api-routers-1]
Files to create:
- `apps/api/src/trpc/routers/project.ts` — CRUD (create, list, getById, update, delete, updateStatus)
- `apps/api/src/trpc/routers/ingestion.ts` — createIngestion, getByProject, retryIngestion
- `apps/api/src/trpc/routers/story.ts` — getByProject, update, regenerate
- `apps/api/src/trpc/routers/job.ts` — getJobsByProject, getJobById, cancelJob
- Update `apps/api/src/trpc/routers/index.ts` — register new routers

All mutations use `protectedProcedure`. Input validation via Zod from `@contenthq/shared`.

#### Task 1.2 — Create `packages/ingestion` [Size: L] [Agent: ingestion-pkg]
Content source adapters for URL-based ingestion.

Files to create:
- `packages/ingestion/package.json` (deps: `@contenthq/shared`, `@contenthq/storage`, `cheerio`, `@mozilla/readability`, `jsdom`)
- `packages/ingestion/tsconfig.json`
- `packages/ingestion/src/index.ts`
- `packages/ingestion/src/types.ts` — ContentSource, ExtractionResult, IngestionAdapter interface
- `packages/ingestion/src/adapters/url.adapter.ts` — Generic URL extraction (fetch + readability)
- `packages/ingestion/src/adapters/youtube.adapter.ts` — YouTube transcript extraction
- `packages/ingestion/src/adapters/rss.adapter.ts` — RSS feed parsing
- `packages/ingestion/src/adapters/index.ts` — Adapter registry (detect input type -> route to adapter)
- `packages/ingestion/src/service.ts` — IngestionService class

**Reference**: `social_intelligence/src/features/content/services/extraction.service.ts`

#### Task 1.3 — Create `packages/ai` (LLM providers) [Size: L] [Agent: ai-pkg]
Multi-provider AI abstraction layer using Vercel AI SDK.

Files to create:
- `packages/ai/package.json` (deps: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@contenthq/shared`, `zod`)
- `packages/ai/tsconfig.json`
- `packages/ai/src/index.ts`
- `packages/ai/src/types.ts` — AIProviderConfig, GenerationOptions, GenerationResult
- `packages/ai/src/registry.ts` — AIProviderRegistry class (register, getProvider, getDefault)
- `packages/ai/src/providers/openai.ts` — OpenAI provider (GPT-4o, DALL-E 3)
- `packages/ai/src/providers/anthropic.ts` — Claude provider
- `packages/ai/src/providers/google.ts` — Gemini provider
- `packages/ai/src/providers/index.ts` — Provider barrel export
- `packages/ai/src/services/llm.service.ts` — generateText(), generateStructuredOutput()
- `packages/ai/src/services/image.service.ts` — generateImage() stub (full impl in Phase 2)
- `packages/ai/src/prompts/story-writing.ts` — Story generation system prompts
- `packages/ai/src/prompts/scene-generation.ts` — Scene breakdown prompts

**Reference**: `ai/ai-platform/src/backend/utils/modelProvider.ts`, PPT App's ITTSProvider pattern

### Sequential Group B (depends on Group A)

#### Task 1.4 — Ingestion & Story Workers [Size: M] [Agent: workers-1]
**Blocked by**: Tasks 1.2, 1.3

Files to create:
- `apps/api/src/workers/ingestion.worker.ts` — INGESTION queue processor: call ingestion adapter -> store in DB -> mark complete
- `apps/api/src/workers/story-writing.worker.ts` — STORY_WRITING queue processor: take ingested content -> LLM story generation -> store story + scenes outline
- Update `apps/api/src/workers/index.ts` — register new workers

**Reference**: `ppt_app/apps/api/src/workers/generation.worker.ts` — BullMQ Worker pattern with progress updates

#### Task 1.5 — Project Pages & Creation Wizard [Size: L] [Agent: web-projects]
**Blocked by**: Task 1.1 (needs API routers for tRPC hooks)

Files to create:
- `apps/web/src/app/(dashboard)/projects/page.tsx` — Project list (grid/list view)
- `apps/web/src/app/(dashboard)/projects/new/page.tsx` — New project wizard
- `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` — Project detail + pipeline progress
- `apps/web/src/app/(dashboard)/projects/[id]/layout.tsx` — Project sub-nav (Overview, Story, Scenes, Preview)
- `apps/web/src/components/projects/project-card.tsx`
- `apps/web/src/components/projects/project-wizard.tsx` — Multi-step form (source -> options -> confirm)
- `apps/web/src/components/projects/pipeline-progress.tsx` — 7-stage visual progress
- `apps/web/src/components/projects/ingestion-form.tsx` — URL/file input
- `apps/web/src/store/project-store.ts` — Zustand store for project state

### Phase 1 Dependency Graph
```
1.1 (routers) ─────────────> 1.5 (web-projects)
1.2 (ingestion) ──┐
1.3 (ai pkg)   ──┴──> 1.4 (workers)
```

### Phase 1 Verification
- Create a project via wizard
- Ingest content from a URL (worker processes)
- Trigger story generation from ingested content
- Story appears with scenes outlined
- Job progress shows in pipeline indicator
- `pnpm check` passes

---

## Phase 2: Scenes + Visuals

**Goal**: Generate scenes from stories, create AI images, verify visual quality.

**Agent team**: 1 lead + up to 4 parallel teammates

### Parallel Group A

#### Task 2.1 — Scene, Pipeline, Media tRPC Routers [Size: M] [Agent: api-routers-2]
Files to create:
- `apps/api/src/trpc/routers/scene.ts` — list by story, reorder, update script/visual prompt, regenerate
- `apps/api/src/trpc/routers/pipeline.ts` — startStage, pause, resume, getStageStatus
- `apps/api/src/trpc/routers/media.ts` — list by project, upload, delete, getSignedUrl
- Update `apps/api/src/trpc/routers/index.ts`

#### Task 2.2 — AI Image & Vision Services [Size: M] [Agent: ai-image]
Extend `packages/ai` with image generation and vision verification.

Files to create/update:
- `packages/ai/src/services/image.service.ts` — Full impl: DALL-E 3 image generation
- `packages/ai/src/services/vision.service.ts` — GPT-4o vision: score image against scene description (relevance, quality, consistency, safety)
- `packages/ai/src/prompts/image-generation.ts` — Scene-to-image-prompt conversion
- `packages/ai/src/prompts/visual-verification.ts` — Scoring rubric prompt

### Sequential Group B (depends on Group A)

#### Task 2.3 — Scene & Visual Workers [Size: L] [Agent: workers-2]
**Blocked by**: Tasks 2.1, 2.2

Files to create:
- `apps/api/src/workers/scene-generation.worker.ts` — SCENE_GENERATION: break story into scenes with timing/descriptions
- `apps/api/src/workers/visual-generation.worker.ts` — VISUAL_GENERATION: generate images per scene, upload to R2
- `apps/api/src/workers/visual-verification.worker.ts` — VISUAL_VERIFICATION: vision AI scoring, auto-retry if score < 60
- Update `apps/api/src/workers/index.ts`

#### Task 2.4 — Story Editor & Scene Editor UI [Size: L] [Agent: web-editor]
**Blocked by**: Task 2.1

Files to create:
- `apps/web/src/app/(dashboard)/projects/[id]/story/page.tsx` — Story editor
- `apps/web/src/app/(dashboard)/projects/[id]/scenes/page.tsx` — Scene list/grid
- `apps/web/src/components/story/story-editor.tsx` — Rich text editing, AI regeneration
- `apps/web/src/components/scenes/scene-card.tsx` — Thumbnail, script preview, status badge
- `apps/web/src/components/scenes/scene-editor.tsx` — Full scene editor (script, visual prompt, timing)
- `apps/web/src/components/scenes/scene-timeline.tsx` — Visual timeline of scene sequence
- `apps/web/src/components/scenes/visual-preview.tsx` — Generated image preview + regenerate
- `apps/web/src/store/scene-store.ts` — Zustand store for scene editing

#### Task 2.5 — Media Library Page [Size: S] [Agent: web-media]
**Blocked by**: Task 2.1

Files to create:
- `apps/web/src/app/(dashboard)/media/page.tsx` — Media library grid
- `apps/web/src/components/media/media-grid.tsx` — Grid with type filters
- `apps/web/src/components/media/media-upload.tsx` — Drag & drop upload
- `apps/web/src/components/media/media-preview.tsx` — Preview modal

### Phase 2 Verification
- Scenes generated from a story with correct ordering
- Images generated and stored in R2
- Visual verification scores images, auto-regenerates poor ones
- Scene editor allows editing script and visual prompt
- Media library shows all generated assets
- `pnpm check` passes

---

## Phase 3: Audio + Video Generation

**Goal**: TTS narration, audio mixing, video compilation, and final assembly.

**Agent team**: 1 lead + up to 5 parallel teammates

### Parallel Group A (all start together)

#### Task 3.1 — Create `packages/tts` [Size: L] [Agent: tts-pkg]
TTS provider registry adapted from PPT App.

Files to create:
- `packages/tts/package.json` (deps: `openai`, `@contenthq/shared`, `@contenthq/storage`)
- `packages/tts/tsconfig.json`
- `packages/tts/src/index.ts`
- `packages/tts/src/types.ts` — ITTSProvider, Voice, GenerateAudioOptions, AudioGenerationResult
- `packages/tts/src/providers/openai.ts` — OpenAI TTS (tts-1, tts-1-hd)
- `packages/tts/src/providers/elevenlabs.ts` — ElevenLabs
- `packages/tts/src/providers/index.ts` — Provider registry with fallback
- `packages/tts/src/service.ts` — TTSService: generateAudio(), getVoices(), provider selection

**Reference**: `ppt_app/packages/shared/src/ai/tts-providers/` and `ppt_app/packages/shared/src/ai/tts-provider-service.ts`

#### Task 3.2 — Create `packages/video` (FFmpeg) [Size: L] [Agent: video-pkg]
FFmpeg-based video compilation.

Files to create:
- `packages/video/package.json` (deps: `fluent-ffmpeg`, `@contenthq/storage`, `@contenthq/shared`)
- `packages/video/tsconfig.json`
- `packages/video/src/index.ts`
- `packages/video/src/types.ts` — VideoCompilationOptions, SceneClip, AudioTrack, CompilationResult
- `packages/video/src/ffmpeg.ts` — FFmpeg wrapper (check install, execute commands)
- `packages/video/src/services/scene-video.service.ts` — Image + motion -> video (Ken Burns, zoom, pan)
- `packages/video/src/services/audio-mixer.service.ts` — Narration + music mixing with volume ducking
- `packages/video/src/services/assembler.service.ts` — Concatenate scene videos + transitions -> final
- `packages/video/src/utils/temp-files.ts` — Temp file management

#### Task 3.3 — Voice & Music tRPC Routers [Size: M] [Agent: api-routers-3]
Files to create:
- `apps/api/src/trpc/routers/voice.ts` — list voices, create profile, set default, preview
- `apps/api/src/trpc/routers/music.ts` — list tracks, upload custom, filter by mood/genre
- Update `apps/api/src/trpc/routers/index.ts`

#### Task 3.6 — Video Preview Page [Size: M] [Agent: web-video]
Files to create:
- `apps/web/src/app/(dashboard)/projects/[id]/preview/page.tsx`
- `apps/web/src/components/video/video-player.tsx` — Video player with controls
- `apps/web/src/components/video/assembly-progress.tsx` — Stage progress for assembly
- `apps/web/src/components/video/download-button.tsx` — Download/export

### Sequential Group B (depends on 3.1, 3.2)

#### Task 3.4 — Audio & Video Workers [Size: L] [Agent: workers-3]
**Blocked by**: Tasks 3.1, 3.2

Files to create:
- `apps/api/src/workers/tts-generation.worker.ts` — TTS_GENERATION: scene scripts -> narration audio -> R2
- `apps/api/src/workers/audio-mixing.worker.ts` — AUDIO_MIXING: narration + music -> mixed audio via FFmpeg
- `apps/api/src/workers/video-generation.worker.ts` — VIDEO_GENERATION: scene image + motion -> video clip
- `apps/api/src/workers/video-assembly.worker.ts` — VIDEO_ASSEMBLY: all scenes + audio -> final video
- Update `apps/api/src/workers/index.ts`

#### Task 3.5 — Voice & Music Library Pages [Size: M] [Agent: web-audio]
**Blocked by**: Task 3.3

Files to create:
- `apps/web/src/app/(dashboard)/voices/page.tsx`
- `apps/web/src/app/(dashboard)/music/page.tsx`
- `apps/web/src/components/voices/voice-card.tsx`
- `apps/web/src/components/voices/voice-selector.tsx` — Reusable voice picker
- `apps/web/src/components/music/music-player.tsx`
- `apps/web/src/components/music/music-browser.tsx`

### Phase 3 Verification
- TTS generates narration audio for scenes
- Audio mixing combines narration + music
- Video generation creates clips from scene images
- Final assembly produces complete video
- Voice/music pages functional
- Video preview plays assembled video
- `pnpm check` passes

---

## Phase 4: Polish + Billing

**Goal**: Credit system, settings, pipeline orchestrator, testing, production readiness.

**Agent team**: 1 lead + up to 5 parallel teammates

### Parallel Group A

#### Task 4.1 — Billing tRPC Router & Credit Service [Size: M] [Agent: api-billing]
Files to create:
- `apps/api/src/trpc/routers/billing.ts` — getBalance, getTransactions, getPlans, estimateProjectCost
- `apps/api/src/services/credit.service.ts` — chargeCredits(), refundCredits(), hasEnoughCredits(), reserveCredits()
- `apps/api/src/trpc/routers/ai.ts` — listProviders, listModels, getProviderStatus
- Update `apps/api/src/trpc/routers/index.ts`

#### Task 4.4 — AI Settings Page [Size: S] [Agent: web-ai-settings]
Files to create:
- `apps/web/src/app/(dashboard)/settings/page.tsx` — User settings
- `apps/web/src/app/(dashboard)/settings/ai/page.tsx` — AI provider config
- `apps/web/src/components/settings/provider-config.tsx`

#### Task 4.5 — Pipeline Orchestrator Service [Size: L] [Agent: pipeline-orch]
The master coordinator that chains all 7 stages.

Files to create:
- `apps/api/src/services/pipeline-orchestrator.ts` — PipelineOrchestrator class:
  - `startPipeline(projectId)` — kicks off INGESTION
  - Stage completion triggers next stage automatically
  - Handles parallel stages (VIDEO_GENERATION + TTS_GENERATION can run concurrently)
  - Updates project.status and project.progressPercent
  - Retry/resume for partial failures
- `apps/api/src/services/pipeline-events.ts` — Event emission for frontend polling

Stage flow: INGESTION -> STORY_WRITING -> SCENE_GENERATION -> VISUAL_GENERATION -> VISUAL_VERIFICATION -> [VIDEO_GENERATION || TTS_GENERATION] -> AUDIO_MIXING -> VIDEO_ASSEMBLY

### Sequential Group B (depends on 4.1)

#### Task 4.2 — Credit Enforcement in All Workers [Size: M] [Agent: workers-credits]
**Blocked by**: Task 4.1

Update all 9 worker files to:
- Check credits before AI operations (`hasEnoughCredits()`)
- Reserve credits before execution (`reserveCredits()`)
- Charge on success, refund on failure
- Log to `ai_generations` table for audit

#### Task 4.3 — Billing & Settings Frontend [Size: M] [Agent: web-billing]
**Blocked by**: Task 4.1

Files to create:
- `apps/web/src/app/(dashboard)/billing/page.tsx` — Balance, usage chart, plan info
- `apps/web/src/app/(dashboard)/billing/plans/page.tsx` — Plan comparison
- `apps/web/src/app/(dashboard)/billing/history/page.tsx` — Transaction table
- `apps/web/src/components/billing/credit-balance.tsx` — Balance display (reusable in header)
- `apps/web/src/components/billing/plan-card.tsx`
- `apps/web/src/components/billing/usage-chart.tsx`
- `apps/web/src/components/billing/transaction-table.tsx`

### Final Group C

#### Task 4.6 — Tests [Size: M] [Agent: testing]
**Blocked by**: All other tasks

Files to create:
- `apps/api/src/__tests__/trpc/project.test.ts`
- `apps/api/src/__tests__/trpc/pipeline.test.ts`
- `apps/api/src/__tests__/services/credit.test.ts`
- `apps/api/src/__tests__/services/pipeline-orchestrator.test.ts`
- `packages/shared/src/__tests__/schemas.test.ts`
- `packages/queue/src/__tests__/queues.test.ts`

### Phase 4 Verification
- Full pipeline runs end-to-end: URL -> ... -> final video
- Credits deducted on AI operations
- Insufficient credits blocks with clear error
- Billing page shows correct balance/history
- Settings page saves preferences
- `pnpm check` passes (lint + typecheck + test)

---

## Summary

| Metric | Count |
|--------|-------|
| Phases | 5 (0-4) |
| Total tasks | 27 |
| New packages | 7 (shared, queue, storage, ingestion, ai, tts, video) |
| New DB tables | ~20 + enums |
| New tRPC routers | 11 |
| New workers | 9 |
| New frontend pages | ~15 |
| New components | ~30+ |
| Max parallel agents per phase | 5-6 |

## Agent Team Usage per Phase

| Phase | Parallel Agents | Critical Path |
|-------|----------------|---------------|
| 0: Foundation | 4 parallel (shared, db, storage, web-layout), then queue, then api-infra | shared -> queue -> api-infra |
| 1: Ingestion+Story | 3 parallel (routers, ingestion, ai), then workers + web | ingestion + ai -> workers |
| 2: Scenes+Visuals | 2 parallel (routers, ai-image), then workers + web-editor + web-media | routers + ai-image -> workers |
| 3: Audio+Video | 4 parallel (tts, video, routers, web-video), then workers + web-audio | tts + video -> workers |
| 4: Polish+Billing | 3 parallel (billing, settings, orchestrator), then credits + web-billing, then tests | billing -> credit enforcement |

## Critical Files to Coordinate
- `packages/db/src/schema/index.ts` — Must export all tables; every router depends on it
- `apps/api/src/trpc/routers/index.ts` — appRouter barrel; web type safety depends on it
- `apps/api/src/workers/index.ts` — Worker registration; server startup depends on it
- `apps/api/src/index.ts` — Server entry; must init workers + handle shutdown
