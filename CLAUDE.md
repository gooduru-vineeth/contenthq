# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Start everything (requires Docker for Postgres)
pnpm docker:up                    # Start Postgres
pnpm dev                          # Start all apps (web :3000, api :3001)

# Build
pnpm build                        # Build all packages (Turborepo)
pnpm --filter @contenthq/web build   # Build web only
pnpm --filter @contenthq/api build   # Type-check API only (tsc --noEmit)

# Lint + Typecheck + Test (full quality check)
pnpm check                        # Runs lint, typecheck, test across all apps
pnpm lint                         # Lint all apps
pnpm lint:fix                     # Auto-fix lint issues
pnpm typecheck                    # TypeScript checks across all apps

# Test
pnpm test                         # Run all tests (Vitest)
pnpm --filter @contenthq/api test           # API tests only
pnpm --filter @contenthq/web test           # Web tests only
pnpm --filter @contenthq/api test:watch     # API tests in watch mode
pnpm --filter @contenthq/web test:watch     # Web tests in watch mode
pnpm --filter @contenthq/api test:coverage  # API test coverage
pnpm --filter @contenthq/web test:coverage  # Web test coverage

# Database (requires .env with DATABASE_URL at root, loaded via dotenv-cli)
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Run migrations
pnpm db:push                      # Push schema directly (dev shortcut)
pnpm db:studio                    # Open Drizzle Studio GUI
```

## Architecture Overview

ContentHQ is a **multi-tenant AI-powered content generation platform** built as a Turborepo monorepo. The platform transforms raw content (YouTube videos, RSS feeds, URLs, topics) into polished video content through a 7-stage automated pipeline.

**Core Capabilities**:
- **AI Content Pipeline**: Automated story writing, scene generation, visual creation, video assembly
- **Visual Workflow Builder**: React Flow-based programming interface for custom automation
- **Media Generation Studio**: Multi-provider image/video/audio generation with AI conversations
- **Speech Synthesis**: 6 TTS providers with voice cloning and multilingual support
- **Multi-Provider AI**: Intelligent provider selection and automatic failover across 5+ LLM providers
- **Credit-Based Billing**: Track usage, manage subscriptions, and control costs

**Technology Stack**:
- **Frontend**: Next.js 15.1.0 (React 19, App Router, Turbopack), shadcn/ui, Tailwind v4
- **Backend**: Hono HTTP server, tRPC v11 for type-safe API
- **Queue**: BullMQ + Redis for background job processing (12 workers)
- **Database**: PostgreSQL (40 tables) via Drizzle ORM v0.39
- **AI**: Vercel AI SDK, OpenAI, Anthropic, Google (Vertex & Studio), xAI
- **Media**: FFmpeg for video processing, multiple providers for image/video generation
- **TTS**: 6 providers (OpenAI, ElevenLabs, Google Cloud, Gemini, Sarvam, Inworld)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: better-auth v1.2 with Drizzle adapter

## Architecture

**Monorepo**: pnpm workspaces + Turborepo. Package manager is pnpm 9.

### Apps

- **`apps/web`** — Next.js 15 (React 19, App Router, Turbopack). Frontend at `:3000`.
- **`apps/api`** — Hono HTTP server running on Node via `@hono/node-server` at `:3001`. All API business logic lives here.

### Packages

ContentHQ uses 9 shared packages organized by domain:

#### Core Infrastructure

- **`packages/db`** — Drizzle ORM + `postgres` driver. **40-table schema** organized by domain:
  - **Authentication**: 4 tables via better-auth (user, session, account, verification)
  - **Content Pipeline**: 21 tables (projects, stories, scenes, scene_visuals, scene_videos, scene_audio_mixes, ingested_content, media_assets, music_tracks, voice_profiles, speech_generations, generated_media, media_conversations, etc.)
  - **AI Management**: ai_providers, ai_models, ai_generations, generation_jobs, prompt_templates, prompt_template_versions, project_prompt_configs, personas
  - **Workflows**: agents, flows, flow_nodes, flow_edges, flow_executions
  - **Billing**: subscription_plans, subscriptions, credit_balances, credit_transactions
  - Exports `db` client, schema tables, repositories. Used by both `api` and `web`.

- **`packages/shared`** — Shared types, Zod schemas, constants, and utilities. Includes:
  - Type definitions for pipeline stages, AI providers, media generation, billing
  - Zod validation schemas for API inputs/outputs
  - Constants for credit costs, pipeline stage names, provider capabilities

- **`packages/typescript-config`** — Shared tsconfig presets (`base.json`, `node.json`, `nextjs.json`)

#### AI & Media Services

- **`packages/ai`** — Multi-provider AI abstraction layer with automatic failover:
  - **LLM Providers**: Anthropic (Claude 3.5 Sonnet, Opus), OpenAI (GPT-4, GPT-4 Turbo), Google (Gemini 1.5 Pro/Flash), Google Vertex AI, xAI (Grok)
  - **Image Providers**: OpenAI (DALL-E 3/2), Fal.ai (FLUX, Stable Diffusion), Replicate (various models)
  - **Video Providers**: Google Vertex AI (Veo), Replicate (AnimateDiff, Zeroscope), Fal.ai
  - **Model Factory**: Intelligent provider selection based on capability, cost, and availability
  - **Usage Tracking**: Automatic credit deduction and generation logging
  - Integration with Vercel AI SDK for streaming and structured outputs

- **`packages/tts`** — Text-to-speech provider registry with 6 providers:
  - OpenAI TTS (tts-1, tts-1-hd with 6 voices: alloy, echo, fable, onyx, nova, shimmer)
  - ElevenLabs (voice cloning, multilingual, emotion control)
  - Google Cloud Text-to-Speech (100+ voices, 40+ languages, SSML support)
  - Google Gemini TTS (experimental)
  - Sarvam AI (Indic languages - Hindi, Tamil, Telugu, etc.)
  - Inworld AI (character voices with emotions)
  - Unified interface for voice listing, audio generation, and streaming support

- **`packages/video`** — FFmpeg video processing utilities:
  - Video concatenation, trimming, format conversion
  - Audio extraction, mixing, and volume normalization
  - Subtitle embedding with custom styling
  - Thumbnail generation
  - Scene video assembly with transitions and effects
  - Motion effects (Ken Burns zoom, panning)

#### Background Processing

- **`packages/queue`** — BullMQ job queue management:
  - Queue creation and configuration with Redis
  - Job scheduling with priorities and delays
  - Worker lifecycle management (start, stop, graceful shutdown)
  - Event listeners (completed, failed, progress tracking)
  - Redis connection pooling and health checks

#### Content Ingestion

- **`packages/ingestion`** — Content source adapters for importing raw content:
  - **YouTube Adapter**: Video transcript extraction, metadata parsing, engagement metrics
  - **RSS Adapter**: Feed parsing, article extraction, content ranking
  - **URL Adapter**: Web scraping with cheerio, content extraction, readability scoring
  - **Topic Adapter**: Generate content ideas from topics using AI
  - Unified interface for all adapters with engagement scoring algorithm

#### Storage

- **`packages/storage`** — Cloudflare R2/S3 storage abstraction:
  - File upload with presigned URLs for direct client uploads
  - Public/private bucket management
  - Automatic content-type detection
  - URL generation for stored assets
  - Multipart upload support for large files
  - S3-compatible interface works with any S3-compatible storage

## Core Features

### 1. AI Content Pipeline (7 Stages)

Automated content-to-video transformation with 12 BullMQ workers:

1. **Ingestion** (`ingestion.worker.ts`): Extract content from YouTube, RSS, URLs, or topics. Ranks content by engagement score (views×1 + likes×10 + comments×20 + shares×50).
2. **Story Writing** (`story-writing.worker.ts`): AI generates structured narrative with scene breakdown using Claude/GPT-4.
3. **Scene Generation** (`scene-generation.worker.ts`): Break story into visual scenes with descriptions, narration, and motion instructions.
4. **Visual Generation** (`visual-generation.worker.ts`): Create images/videos for each scene using multi-provider AI (DALL-E, Fal.ai, Replicate).
5. **Visual Verification** (`visual-verification.worker.ts`): AI vision models validate visuals match scene requirements (relevance, quality, consistency, safety scores). Automatic retry if score <60%.
6. **Video Generation** (`video-generation.worker.ts`): Assemble scenes into video timeline with transitions and motion effects using FFmpeg or AI video generation.
7. **Audio Layering** (`tts-generation.worker.ts`, `audio-mixing.worker.ts`): Generate TTS narration, mix with background music (ducking), combine with video timeline.
8. **Assembly** (`video-assembly.worker.ts`): Final video concatenation with captions and branding.

**Additional Workers**:
- `speech-generation.worker.ts`: Standalone TTS generation (non-pipeline)
- `media-generation.worker.ts`: Standalone media generation (non-pipeline)

**Implementation**: All workers in `apps/api/src/workers/` with automatic retry, error recovery, and progress tracking.

---

### 2. Visual Flow Builder

React Flow-based workflow programming interface with **8 node types**:

- **Input**: Flow entry points with configurable parameters (text, number, boolean, select)
- **Output**: Flow result outputs with type validation
- **Agent**: AI agent execution with prompt templates and model selection
- **Builtin**: Pre-built actions (API calls, data transforms, conditional logic)
- **Condition**: Branching logic based on data evaluation (if/else)
- **Parallel Fan-Out**: Execute multiple branches concurrently
- **Parallel Fan-In**: Wait for parallel branches to complete before continuing
- **Delay**: Pause execution for specified duration (useful for rate limiting)

**Configuration Options**:
- `autoAdvance`: Automatically advance to next stage on completion
- `parallelScenes`: Generate scenes in parallel vs sequential
- `maxRetries`: Number of retry attempts for failed nodes
- `timeoutMs`: Maximum execution time per node

**Location**:
- Components: `apps/web/src/components/flows/` (node components, edge types)
- Execution Engine: `apps/api/src/services/flow-engine.ts` (handles parallel execution, retries, conditions)

**Storage**: Flow definitions stored in `flows` table as JSONB (React Flow format)

---

### 3. Media Generation Studio

Multi-provider image/video/audio generation with **AI conversations**:

**Supported Providers**:
- **Image**: OpenAI DALL-E 3/2, Fal.ai (FLUX, Stable Diffusion), Replicate (various models)
- **Video**: Google Veo, Replicate (AnimateDiff, Zeroscope), Fal.ai
- **Audio**: Coming soon (TTS available via Speech Generation)

**Key Features**:
- **Conversation History**: Track prompts, parameters, outputs for iterative refinement (stored in `media_conversations` table)
- **Asset Library**: Organize generated media by project, tags, metadata
- **Batch Generation**: Queue multiple generations with different parameters
- **Cost Estimation**: Real-time credit calculation before generation
- **Progress Tracking**: Live updates during generation with job queue status

**Pages**:
- Media Studio: `apps/web/src/app/(dashboard)/media-studio/`
- Asset Library: `apps/web/src/app/(dashboard)/media/`

**Implementation**: `packages/ai/src/providers/media/` with unified interface across all providers

---

### 4. Speech Generation Interface

TTS with **6 provider options** and advanced configuration:

**Providers**:
1. **OpenAI TTS**: Fast, natural voices (tts-1, tts-1-hd) with 6 options
2. **ElevenLabs**: Professional voice cloning, multilingual, emotion control (requires API key)
3. **Google Cloud TTS**: 100+ voices, 40+ languages, SSML support
4. **Google Gemini TTS**: Experimental, free tier available
5. **Sarvam AI**: Specialized in Indic languages (Hindi, Tamil, Telugu, etc.)
6. **Inworld AI**: Character voices with emotional range

**Features**:
- **Voice Profiles**: Save custom voice configurations with presets (voice, speed, pitch, stability)
- **Batch Generation**: Generate multiple audio files from script segments
- **Audio Preview**: In-browser playback before download
- **Credit Estimation**: Real-time cost calculation based on text length and provider
- **SSML Support**: Advanced text-to-speech markup (Google Cloud only)

**Location**:
- UI: `apps/web/src/app/(dashboard)/speech-generations/`
- Providers: `packages/tts/src/providers/`
- Worker: `apps/api/src/workers/speech-generation.worker.ts`

---

### 5. Admin Dashboard

Manage AI models, providers, prompts, personas, and agents (restricted to admin users):

**Admin Pages**:
- **AI Providers** (`/admin/providers`): Configure API keys, rate limits, pricing for each provider
- **AI Models** (`/admin/models`): Enable/disable models, set capabilities (text, image, video, audio), configure costs
- **Prompt Templates** (`/admin/prompts`): Version-controlled prompts with variable interpolation ({{variable}})
- **Personas** (`/admin/personas`): Define AI character behaviors, response styles, tone
- **Agents** (`/admin/agents`): Combine prompts + personas + models into reusable AI agents
- **Usage Analytics**: Track generation costs, credits consumed, provider performance

**Access Control**: Restricted to users with `role: 'admin'` via `adminProcedure` in tRPC

**Location**: `apps/web/src/app/(dashboard)/admin/`

## Data Flow & Architecture

### tRPC API (19 Routers)

End-to-end type safety from frontend to database. All routers in `apps/api/src/trpc/routers/`:

**Pipeline & Projects**:
- `project`: Project CRUD, folder organization, pipeline initiation
- `ingestion`: Content source import (YouTube, RSS, URL, topic), adapter management
- `story`: AI story generation, scene breakdown, narrative structure
- `scene`: Scene CRUD, visual/audio attachments, status tracking
- `pipeline`: Pipeline execution, stage monitoring, progress updates
- `job`: BullMQ job status, retry, cancellation, queue management

**Media & Generation**:
- `media`: Asset library, uploads, metadata, tagging
- `mediaGeneration`: Multi-provider image/video generation with conversations
- `speechGeneration`: TTS generation, voice selection, batch processing
- `voice`: Voice profile CRUD, provider voice listing
- `music`: Music track library, licensing, search

**Workflow & Automation**:
- `agent`: AI agent CRUD, execution, versioning
- `flow`: Flow builder, node/edge management, validation
- `flowExecution`: Execute flows, track progress, view results
- `prompt`: Prompt template versioning, variable interpolation

**Admin & Configuration**:
- `adminProvider`: AI provider configuration (requires admin role)
- `adminModel`: AI model management (requires admin role)
- `billing`: Credits, subscriptions, transactions, usage analytics

**System**:
- `health`: API health check, database connection status

**Location**: `apps/api/src/trpc/routers/` — one file per router, all exported via `routers/index.ts`

---

### BullMQ Workers (12 Workers)

Background job processors for async pipeline execution. All workers in `apps/api/src/workers/`:

**Pipeline Workers** (executed sequentially per project):
1. `ingestion.worker.ts`: Fetch content from YouTube, RSS, URLs, topics. Rank by engagement.
2. `story-writing.worker.ts`: Generate story structure with AI (scenes, narration, arc)
3. `scene-generation.worker.ts`: Break story into visual scenes with descriptions
4. `visual-generation.worker.ts`: Create images/videos for scenes (multi-provider)
5. `visual-verification.worker.ts`: AI validates visuals match requirements (retry if score <60%)
6. `video-generation.worker.ts`: Assemble scene visuals into timeline with FFmpeg
7. `tts-generation.worker.ts`: Generate narration audio from scene text
8. `audio-mixing.worker.ts`: Mix TTS + music + sound effects with ducking
9. `video-assembly.worker.ts`: Combine video timeline + mixed audio → final video

**Standalone Workers** (executed on-demand):
10. `speech-generation.worker.ts`: Standalone TTS generation (non-pipeline)
11. `media-generation.worker.ts`: Standalone media generation (non-pipeline)

**System**:
12. `index.ts`: Worker registration, lifecycle management, graceful shutdown

**Configuration**: Redis-backed queues with automatic retry, exponential backoff, and dead letter queue

---

### Data Flow Diagram

```
User Action (web)
  ↓
tRPC Hook (type-safe: api.project.create.useMutation())
  ↓
HTTP POST /trpc/project.create (Next.js → Hono)
  ↓
tRPC Router (Zod validation, better-auth session check)
  ↓
├─→ Drizzle ORM → PostgreSQL (store project metadata, state)
├─→ BullMQ Queue → Redis → Worker (async processing)
│     ↓
│   Worker → AI Provider (OpenAI, Anthropic, Google, xAI, Fal.ai, Replicate)
│     ↓
│   Worker → Storage Provider (Cloudflare R2 for media assets)
│     ↓
│   Worker → FFmpeg (video processing, audio mixing)
│     ↓
│   Worker → Drizzle → PostgreSQL (update state: completed/failed)
└─→ Response (type-safe) → Web UI → React Query cache update
```

---

### Adding a New tRPC Router

1. Create file in `apps/api/src/trpc/routers/`, e.g., `my-feature.ts`
2. Define router with `publicProcedure` or `protectedProcedure`:
   ```typescript
   export const myFeatureRouter = router({
     list: protectedProcedure.query(async ({ ctx }) => {
       return await ctx.db.select().from(myFeatureTable);
     }),
     create: protectedProcedure
       .input(z.object({ name: z.string() }))
       .mutation(async ({ ctx, input }) => {
         return await ctx.db.insert(myFeatureTable).values(input);
       }),
   });
   ```
3. Add to `appRouter` in `routers/index.ts`:
   ```typescript
   export const appRouter = router({
     // ... existing routers
     myFeature: myFeatureRouter,
   });
   ```
4. Web app automatically gets type-safe hooks: `api.myFeature.list.useQuery()`, `api.myFeature.create.useMutation()`

---

### Adding a New BullMQ Worker

1. Create file in `apps/api/src/workers/`, e.g., `my-task.worker.ts`
2. Define worker with job handler:
   ```typescript
   import { Worker } from 'bullmq';
   import { redis } from '../lib/redis';

   export const myTaskWorker = new Worker('my-task', async (job) => {
     const { data } = job;
     // Process job
     await job.updateProgress(50);
     // Return result
     return { success: true };
   }, { connection: redis });
   ```
3. Add to worker index in `workers/index.ts`:
   ```typescript
   import { myTaskWorker } from './my-task.worker';
   export const workers = [
     // ... existing workers
     myTaskWorker,
   ];
   ```
4. Queue jobs from tRPC router or other workers:
   ```typescript
   import { myTaskQueue } from '@contenthq/queue';
   await myTaskQueue.add('my-task-job', { userId, data });
   ```

## AI Integration

### Multi-Provider Architecture

ContentHQ uses the **Vercel AI SDK** with custom provider adapters for maximum flexibility and cost optimization. All providers in `packages/ai/src/providers/`.

**LLM Providers**:
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus (via `@ai-sdk/anthropic`)
  - Best for: Creative writing, long-form content, complex reasoning
  - Cost: Medium to high
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo (via `@ai-sdk/openai`)
  - Best for: General purpose, fast responses, structured outputs
  - Cost: Medium
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash (via `@ai-sdk/google`)
  - Best for: Long context (1M+ tokens), multimodal, cost-effective
  - Cost: Low to medium
- **Google Vertex AI**: Enterprise Gemini with advanced features (via `@ai-sdk/google-vertex`)
  - Best for: Production workloads, SLA requirements, enterprise compliance
  - Cost: Medium
- **xAI**: Grok models (via `@ai-sdk/xai`)
  - Best for: Real-time data, up-to-date knowledge
  - Cost: Medium

**Image Providers** (`packages/ai/src/providers/media/image/`):
- **OpenAI DALL-E 3**: High-quality, prompt-following, $0.04/image
- **OpenAI DALL-E 2**: Fast, cost-effective, $0.02/image
- **Fal.ai**: FLUX, Stable Diffusion models, variable pricing
- **Replicate**: Various open-source models, pay-per-second

**Video Providers** (`packages/ai/src/providers/media/video/`):
- **Google Vertex AI Veo**: High-quality video generation
- **Replicate**: AnimateDiff, Zeroscope, various models
- **Fal.ai**: Video generation models

---

### Intelligent Provider Selection

The **Model Factory** (`packages/ai/src/model-factory.ts`) handles:

1. **Capability Matching**: Select providers based on required features
   - Streaming support (real-time responses)
   - Vision capabilities (image understanding)
   - Function calling (structured outputs)
   - Context window size (long documents)

2. **Cost Optimization**: Route to cheaper providers when quality requirements are met
   - Use Gemini Flash for simple tasks vs GPT-4 for complex reasoning
   - DALL-E 2 for drafts vs DALL-E 3 for final images

3. **Automatic Failover**: Retry with backup provider on errors or rate limits
   - Primary provider fails → try secondary → try tertiary
   - Track provider health and adjust routing dynamically

4. **Usage Tracking**: Log all generations with costs for billing and analytics
   - Store in `ai_generations` table with prompt, model, tokens, cost
   - Deduct credits from user balance in `credit_transactions`

---

### Generation Flow

1. User requests generation via tRPC router (e.g., `api.story.generate.useMutation()`)
2. Router validates input with Zod schema, checks user has sufficient credits
3. Model factory selects optimal provider based on requirements and cost
4. Provider generates content (text, image, video, audio) via Vercel AI SDK
5. Result stored in database with metadata:
   - `ai_generations`: prompt, model, response, tokens, cost, duration
   - `generation_jobs`: BullMQ job ID, status, progress, error messages
6. User credits deducted via `credit_transactions` table
7. Generation job marked complete, webhook/notification sent to user
8. Result returned to frontend with presigned URLs for media assets

**Tables**: `ai_providers`, `ai_models`, `ai_generations`, `generation_jobs`, `credit_transactions`

**Repositories**: `packages/db/src/repositories/` for database access patterns

## Database Schema (40 Tables)

Schema organized by domain in `packages/db/src/schema/`. All tables use Drizzle ORM with PostgreSQL.

### Authentication (4 tables via better-auth)
- `user`: User accounts with email, hashed password, role (user/admin)
- `session`: Active sessions with tokens, expiry, device info
- `account`: OAuth provider accounts (Google, GitHub, etc.)
- `verification`: Email verification tokens, password reset tokens

### Content Pipeline (21 tables)

**Projects & Content**:
- `projects`: Content projects with title, description, status, folder organization
- `ingested_content`: Raw content from sources (YouTube videos, RSS articles, URLs, topics) with engagement scores
- `stories`: AI-generated story structures with narrative arc, scene breakdown, target audience
- `scenes`: Individual story scenes with descriptions, narration, visual requirements, motion instructions
- `scene_visuals`: Generated images/videos for scenes with verification scores (relevance, quality, consistency, safety)
- `scene_videos`: Assembled video files for scenes with duration, resolution, format
- `scene_audio_mixes`: Mixed audio (TTS voiceover + background music) with ducking levels

**Assets & Media**:
- `media_assets`: Uploaded/generated media files (images, videos, audio) with tags, metadata, storage URLs
- `music_tracks`: Background music library with title, artist, genre, BPM, licensing, preview URL
- `voice_profiles`: Saved TTS voice configurations (provider, voice ID, speed, pitch, stability presets)
- `speech_generations`: TTS generation requests with text, voice profile, audio output URL, duration, cost
- `generated_media`: Image/video generation outputs with prompt, model, parameters, verification results
- `media_conversations`: Generation conversation history for iterative refinement (multi-turn prompt → image cycles)

**AI Management**:
- `ai_providers`: AI service provider configuration (name, type, API key, base URL, rate limits, pricing)
- `ai_models`: Available models with capabilities (text/image/video/audio), context window, costs per token/image/second
- `ai_generations`: Log of all AI generations (prompt, model, response, tokens, cost, duration, status)
- `generation_jobs`: BullMQ job queue records with job ID, status, progress, error messages, retry count

**Prompts & Configuration**:
- `prompt_templates`: Versioned prompt templates with name, category, content, variables ({{variable}})
- `prompt_template_versions`: Historical prompt versions for rollback and A/B testing
- `project_prompt_configs`: Project-specific prompt overrides and customizations
- `personas`: AI character behaviors and response styles (tone, audience, visual style, narrative style)

### Workflows (5 tables)
- `agents`: Reusable AI agents combining prompt + persona + model with versioning
- `flows`: Visual workflow definitions (React Flow format stored as JSONB)
- `flow_nodes`: Flow builder nodes (input, agent, condition, parallelFanOut, parallelFanIn, delay, output)
- `flow_edges`: Connections between flow nodes with conditional logic
- `flow_executions`: Flow execution history with inputs, outputs, duration, node execution logs

### Billing (4 tables)
- `subscription_plans`: Available subscription tiers (free, starter, pro, enterprise) with features, credit limits
- `subscriptions`: User subscription records with plan, status (active/cancelled/expired), billing cycle
- `credit_balances`: User credit balances with total, used, remaining, rollover rules
- `credit_transactions`: Credit purchase/usage history with amount, type (purchase/usage/refund), reason, related generation

---

### Table Relationships

**Key Foreign Keys**:
- `projects.userId` → `user.id`: Project ownership
- `stories.projectId` → `projects.id`: Stories belong to projects
- `scenes.storyId` → `stories.id`: Scenes belong to stories
- `scene_visuals.sceneId` → `scenes.id`: Visuals belong to scenes
- `ai_generations.userId` → `user.id`: Track who generated what
- `generation_jobs.userId` → `user.id`: Job ownership
- `credit_transactions.userId` → `user.id`: Credit history per user

**Schema Files**: One file per table in `packages/db/src/schema/`, all exported via `index.ts`

**Enums**: Defined in `schema/enums.ts` - `project_status`, `scene_status`, `job_status`, `ai_provider_type`, `media_type`, `prompt_type`, `persona_category`

### Auth: better-auth

- **API**: `apps/api/src/lib/auth.ts` — better-auth instance with Drizzle adapter, email/password enabled. Mounted as raw Hono route at `/auth/**`.
- **Web**: `apps/web/src/lib/auth-client.ts` — `createAuthClient` pointed at API URL.
- **tRPC context**: `apps/api/src/trpc/context.ts` extracts session from request headers. `protectedProcedure` enforces auth.

### Frontend Stack

- **UI**: shadcn/ui components in `apps/web/src/components/ui/` (Radix primitives + Tailwind CSS v4 + CVA). Config: `components.json`.
- **Styling**: Tailwind v4 with CSS variables for theming (light/dark) in `globals.css`. Uses `@theme inline` for Tailwind token mapping.
- **State**: Zustand (client state), TanStack React Query (server state via tRPC).
- **Forms**: react-hook-form + @hookform/resolvers (Zod validation).
- **Tables**: @tanstack/react-table.
- **Animations**: framer-motion.
- **Toasts**: sonner (configured in root layout).
- **URL state**: nuqs.
- **Icons**: lucide-react.
- **Utility**: `cn()` helper in `lib/utils.ts` (clsx + tailwind-merge).

## Dashboard Pages (15+ Pages)

Frontend pages in `apps/web/src/app/(dashboard)/`. All pages use shadcn/ui components with Tailwind v4 styling.

### Main Pages
- **`/`** — Dashboard home with project overview, recent activity, usage statistics
- **`/projects`** — Project list with folder organization, search, filters (by status, date)
- **`/projects/[id]`** — Project detail with pipeline stages, progress tracking, scene timeline
- **`/projects/[id]/stories/[storyId]`** — Story editor with narrative arc visualization
- **`/projects/[id]/stories/[storyId]/scenes/[sceneId]`** — Scene editor with visual/audio preview

### Generation Tools
- **`/speech-generations`** — TTS generation interface with voice selection, batch processing, audio preview
- **`/media-studio`** — Multi-provider media generation with conversations, refinement, asset library
- **`/media`** — Asset library with uploads, tagging, search, filtering by type/date/project

### Configuration
- **`/voices`** — Voice profile management (create, edit, delete presets)
- **`/music`** — Music track library with search, preview, licensing info
- **`/personas`** — AI persona CRUD (tone, audience, visual style, narrative style)
- **`/prompts`** — Prompt template versioning with variable interpolation, A/B testing
- **`/billing`** — Credits, subscriptions, usage analytics with charts and export
- **`/settings`** — User preferences, API keys, notification settings, theme toggle

### Admin (Restricted to role='admin')
- **`/admin/providers`** — AI provider configuration (API keys, rate limits, pricing)
- **`/admin/models`** — AI model management (enable/disable, capabilities, costs)
- **`/admin/usage`** — Platform-wide usage analytics, cost breakdown, user activity

**Route Groups**: Pages organized in `(dashboard)` group with shared layout (`layout.tsx`) including sidebar navigation, header with user menu, breadcrumbs

### Hono REST Routes (non-tRPC)

`apps/api/src/routes/` — Traditional Hono routes for things that don't fit tRPC (auth passthrough, health check). CORS middleware in `middleware/cors.ts`, error handler in `middleware/error.ts`.

### Environment Variables

- `.env` at root (loaded by `dotenv-cli` for db commands, read by API process via `src/lib/env.ts` Zod schema)
- Web env validated via `@t3-oss/env-nextjs` in `apps/web/src/lib/env.ts`

**Database**:
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/contenthq`)

**Redis** (for BullMQ):
- `REDIS_HOST`: Redis host (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)
- `REDIS_PASSWORD`: Redis password (optional)
- `REDIS_URL`: Full Redis connection string (alternative to HOST/PORT/PASSWORD)

**Auth**:
- `BETTER_AUTH_SECRET`: Secret key for session encryption (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL`: API base URL for auth endpoints (e.g., `http://localhost:3001`)

**API**:
- `CORS_ORIGIN`: Allowed CORS origins (comma-separated, e.g., `http://localhost:3000,https://app.contenthq.com`)
- `NEXT_PUBLIC_API_URL`: Public API URL for web client (e.g., `http://localhost:3001`)
- `PORT`: API server port (default: `3001`)

**AI Providers** (configure as needed):
- `OPENAI_API_KEY`: OpenAI API key for GPT-4, DALL-E (required for OpenAI)
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude models (required for Anthropic)
- `GOOGLE_API_KEY`: Google AI Studio API key for Gemini (required for Google)
- `GOOGLE_VERTEX_PROJECT_ID`: Google Cloud project ID for Vertex AI (required for Vertex)
- `XAI_API_KEY`: xAI API key for Grok models (required for xAI)

**TTS Providers** (configure as needed):
- `ELEVENLABS_API_KEY`: ElevenLabs API key for voice cloning (optional)
- `GOOGLE_CLOUD_TTS_API_KEY`: Google Cloud TTS API key (optional, different from GOOGLE_API_KEY)
- `SARVAM_API_KEY`: Sarvam API key for Indic languages (optional)
- `INWORLD_API_KEY`: Inworld API key for character voices (optional)

**Media Providers** (configure as needed):
- `FAL_API_KEY`: Fal.ai API key for image/video generation (optional)
- `REPLICATE_API_TOKEN`: Replicate API token for various models (optional)

**Storage** (Cloudflare R2 or S3-compatible):
- `CLOUDFLARE_R2_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: R2 access key ID
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: R2 secret access key
- `CLOUDFLARE_R2_BUCKET_NAME`: R2 bucket name for media storage
- `CLOUDFLARE_R2_PUBLIC_URL`: Public URL for R2 bucket (e.g., `https://media.contenthq.com`)

**Optional**:
- `NODE_ENV`: Environment (development/production/test)
- `LOG_LEVEL`: Logging verbosity (debug/info/warn/error)

### Provider Wrapping Order

Root layout → `<Providers>` → `<TRPCProvider>` (includes QueryClientProvider) → `<TooltipProvider>` → children + `<Toaster>`.

## Testing

**Framework**: Vitest v4 with globals enabled.

- **API tests** (`apps/api/src/__tests__/`): Node environment. Tests for middleware, env validation, tRPC routers, and app setup.
- **Web tests** (`apps/web/src/__tests__/`): jsdom environment with `@testing-library/react` + `@vitejs/plugin-react`. Setup file at `apps/web/src/test-setup.ts`.
- **Config files**: `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`.
- **Do NOT test** `apps/web/src/components/ui/` (shadcn generated components).

### Testing Rules

- ALWAYS write tests for new logic (utilities, middleware, API routes, hooks).
- ALWAYS run `pnpm test` after making code changes.
- Place test files alongside source in `__tests__/` directories mirroring the source structure.
- Use `vi.mock()` for external dependencies (database, auth, etc.).
- Use `vi.spyOn()` for observing side effects (console, fetch, etc.).
- When testing modules that read `process.env`, use `vi.resetModules()` + dynamic `import()` for isolation.
- Type all `res.json()` results with `as` assertions to satisfy strict TypeScript.

## Linting

**ESLint 9** flat config at root (`eslint.config.mjs`). Shared across all apps.

### Key Rules

- `@typescript-eslint/consistent-type-imports`: Enforces `import type` for type-only imports.
- `@typescript-eslint/no-unused-vars`: Error, but allows `_`-prefixed vars/args.
- `@typescript-eslint/no-explicit-any`: Warning (error-free in test files).
- `no-console`: Warning — only `console.warn` and `console.error` are allowed.
- **Web-specific**: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, Next.js rules via `@next/eslint-plugin-next`.
- **Test files**: `no-console` and `no-explicit-any` are relaxed.

### Linting Rules

- ALWAYS run `pnpm lint` before committing.
- Use `import type` for type-only imports (enforced by ESLint).
- Avoid `console.log` — use `console.warn` or `console.error` instead.
- Prefix intentionally unused variables with `_` (e.g., `_unused`).

## Git Hooks

**Husky** manages git hooks. Hooks are in `.husky/`.

| Hook | What runs | Purpose |
|------|-----------|---------|
| **pre-commit** | `lint-staged` (ESLint `--fix` on staged `.ts`/`.tsx`) | Catch lint issues before commit |
| **pre-push** | `pnpm typecheck && pnpm test` | Block push if types or tests fail |

### Commit Rules

- ALWAYS verify `pnpm check` passes before pushing.
- NEVER skip hooks with `--no-verify` unless explicitly necessary.
- NEVER commit `.env` files, secrets, or credentials.
