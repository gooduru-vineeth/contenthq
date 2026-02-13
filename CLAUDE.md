# CLAUDE.md - ContentHQ

**AI-Powered Content Generation Platform** — Transform raw content into polished video content through a fully automated 10-stage AI pipeline.

---

## Commands

### Development
```bash
pnpm install                    # Install all dependencies
pnpm docker:up                  # Start PostgreSQL + Redis
pnpm dev                        # Start web (:3000) + api (:3001)
pnpm db:push                    # Push schema (dev)
pnpm db:studio                  # Open Drizzle Studio
```

### Production
```bash
pnpm build                      # Build all packages
pnpm check                      # Lint + typecheck + test
pnpm db:migrate                 # Run migrations
```

### Troubleshooting: Fix 404 Errors / Port Conflicts

**Symptoms**: All routes return 404, "port already in use", or "unable to acquire lock" errors

**Quick Fix** (run these commands in order):
```bash
# 1. Kill all dev processes
pkill -f "next dev" ; pkill -f "tsx watch" ; pkill -f "turbo run dev"

# 2. Free ports 3000 and 3001
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true

# 3. Remove stale lock files
rm -rf apps/web/.next/dev/lock apps/web/.next/cache 2>/dev/null || true

# 4. Wait a moment for cleanup
sleep 2

# 5. Restart dev server
pnpm dev
```

**One-Liner** (copy-paste this entire command):
```bash
pkill -f "next dev" ; pkill -f "tsx watch" ; pkill -f "turbo run dev" ; sleep 1 ; lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true ; rm -rf apps/web/.next/dev/lock apps/web/.next/cache 2>/dev/null || true ; sleep 2 ; pnpm dev
```

**Root Cause**: Multiple dev server instances running simultaneously, causing port conflicts and stale lock files.

**Prevention**: Always use `Ctrl+C` to stop dev servers gracefully instead of force-killing terminal windows.

---

## Product Overview

ContentHQ transforms one piece of raw content (YouTube video, article, podcast) into dozens of derivative video assets optimized for different platforms.

**Key Benefits**:
- **10x Content Production**: Create 10+ videos from one source in minutes
- **Cost Optimization**: 13x cheaper than traditional production ($0.003 vs $0.04 per image with FLUX)
- **Professional Quality**: Cinema-grade captions, transitions, motion effects, voiceover
- **Multi-Platform**: Optimized for TikTok, YouTube Shorts, Instagram Reels, LinkedIn
- **Zero Manual Work**: Fully automated from ingestion to final video export

**Target Users**: Content creators, marketing agencies, course creators, social media managers, publishers

**Competitive Advantages**:
1. Full pipeline automation (vs manual editing in Descript/Runway)
2. Multi-provider AI with automatic failover and cost routing
3. AI visual verification (prevents bad outputs)
4. Voice cloning via ElevenLabs
5. 7M+ stock media assets (4 providers)
6. A/B testing for model/style/cost optimization

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.1.0 (React 19, App Router, Turbopack)
- **UI**: shadcn/ui (Radix + Tailwind CSS v4)
- **State**: Zustand + TanStack React Query
- **Forms**: react-hook-form + Zod
- **Tables**: @tanstack/react-table
- **Charts**: Recharts
- **Icons**: lucide-react (1000+ icons)

### Backend
- **Server**: Hono (lightweight, Edge-ready)
- **API**: tRPC v11 (25 routers, end-to-end type safety)
- **Queue**: BullMQ + Redis (12 workers)
- **Validation**: Zod schemas

### Database & Storage
- **Database**: PostgreSQL (43 tables)
- **ORM**: Drizzle ORM v0.39
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache**: Redis

### AI & Media
- **AI SDK**: Vercel AI SDK v4
- **LLM Providers**: Anthropic (Claude), OpenAI (GPT-4), Google (Gemini, Vertex), xAI (Grok)
- **Image Providers**: OpenAI DALL-E, Fal.ai (FLUX, Stable Diffusion), Replicate
- **Video Providers**: Google Veo, Replicate (AnimateDiff, Zeroscope), Fal.ai
- **TTS Providers**: OpenAI, ElevenLabs, Google Cloud, Gemini, Sarvam, Inworld (6 total)
- **Stock Media**: Pexels, Unsplash, Pixabay, Storyblocks (7M+ assets)
- **Processing**: FFmpeg (video/audio)

### Authentication
- **Auth**: better-auth v1.2 with Drizzle adapter
- **Sessions**: Database-backed with expiry
- **Password**: bcrypt hashing

### DevOps
- **Monorepo**: pnpm workspaces + Turborepo
- **Linting**: ESLint 9 + Prettier
- **Testing**: Vitest v4
- **TypeScript**: v5 (strict mode)
- **Deployment**: Vercel (web), Railway/Render (API)

---

## Architecture

### Monorepo Structure

```
contenthq/
├── apps/
│   ├── web/                    # Next.js frontend (:3000)
│   └── api/                    # Hono server + workers (:3001)
├── packages/
│   ├── db/                     # Drizzle ORM (43 tables)
│   ├── ai/                     # Multi-provider AI (5 LLM, 3 image, 3 video)
│   ├── tts/                    # 6 TTS providers
│   ├── video/                  # FFmpeg processing
│   ├── queue/                  # BullMQ jobs
│   ├── ingestion/              # Content adapters (YouTube, RSS, URL, topic)
│   ├── stock-media/            # 4 stock media providers
│   ├── storage/                # Cloudflare R2/S3
│   ├── shared/                 # Types, schemas, constants
│   └── typescript-config/      # Shared tsconfig
```

### Apps

**`apps/web`** — Next.js frontend (15+ pages)
- Dashboard, projects, media studio, admin
- tRPC client with type-safe hooks
- shadcn/ui components (DO NOT TEST)

**`apps/api`** — Hono server + BullMQ workers
- 25 tRPC routers
- 12 BullMQ workers (pipeline stages)
- Services: pipeline orchestrator, flow engine, credit manager
- Routes: `/trpc/*`, `/auth/*`, `/health`

### Packages (Core Infrastructure)

**`packages/db`** (4,200 LOC)
- 43 tables: Auth (4), Pipeline (24), Workflows (5), Billing (4), Preferences (2)
- Drizzle ORM with type-safe queries
- PostgreSQL enums for type safety

**`packages/shared`** (1,800 LOC)
- Types, Zod schemas, constants
- Pipeline stages, AI providers, media types

**`packages/ai`** (3,500 LOC)
- Unified LLM/image/video interface
- Multi-provider support with failover
- Cost optimization routing
- Usage tracking and credit deduction

**`packages/tts`** (2,800 LOC)
- 6 TTS providers with unified interface
- Voice listing, audio generation, streaming
- ElevenLabs voice cloning integration

**`packages/video`** (3,200 LOC)
- FFmpeg wrappers for editing, mixing, effects
- 9 motion effects (zoom, pan, Ken Burns, rotate)
- 9+ transition effects (fade, wipe, slide, dissolve)
- 13 animation presets (gentle, dynamic, cinematic, dramatic)
- 50+ caption styles (ASS format)

**`packages/queue`** (1,500 LOC)
- BullMQ job queue with Redis
- Retry strategies, priorities, rate limiting
- 12 pipeline queues + standalone queues

**`packages/ingestion`** (2,100 LOC)
- YouTube, RSS, URL, topic adapters
- Engagement scoring algorithm
- Unified content extraction interface

**`packages/stock-media`** (1,900 LOC)
- 4 providers: Pexels, Unsplash, Pixabay, Storyblocks
- Unified search across 7M+ assets
- Provider fallback on failures

**`packages/storage`** (800 LOC)
- Cloudflare R2/S3 abstraction
- Presigned URLs for client uploads
- Multipart upload for large files

---

## Core Features

### 1. AI Content Pipeline (10 Stages)

Fully automated pipeline with 12 BullMQ workers processing sequential stages:

1. **Ingestion** — Extract content from YouTube/RSS/URL/topic, calculate engagement scores
2. **Story Writing** — AI generates narrative structure with scene breakdown (Claude/GPT-4/Gemini)
3. **Scene Generation** — Break story into detailed scenes with visual descriptions, narration, motion
4. **Visual Generation** — Create images/videos using multi-provider AI (DALL-E, FLUX, Stable Diffusion)
5. **Visual Verification** — AI validates visuals match requirements (score 0-100, auto-retry if <60)
6. **Video Generation** — Assemble scenes with motion effects and transitions
7. **TTS Generation** — Generate narration audio with 6 TTS providers + voice cloning
8. **Caption Generation** — Word-level timed captions with 50+ animation styles (ASS format)
9. **Audio Mixing** — Mix TTS + background music with auto-ducking
10. **Video Assembly** — Combine all scenes into final video with embedded captions

**Pipeline Orchestrator** (`pipeline-orchestrator.ts`):
- Stage coordination with automatic advancement
- Error handling with exponential backoff (max 3 retries)
- Progress tracking (0-100%)
- Cost estimation (typical: $1.50-$3.00 per 60s video)

### 2. Visual Flow Builder

React Flow-based workflow programming with 8 node types:
- **Input/Output** — Flow entry/exit points
- **Agent** — Execute AI with prompt templates
- **Builtin** — Pre-built actions (API, transform, database)
- **Condition** — Branch logic with operators
- **Parallel Fan-Out/Fan-In** — Concurrent execution + merge
- **Delay** — Rate limiting, scheduled execution

**Flow Engine** (`flow-engine.ts`): Executes flows with parallel execution, retry logic, variable passing

### 3. Motion & Transition Controls

**Motion Effects** (9 types): Static, zoom in/out, pan (left/right/up/down), Ken Burns, rotate

**Animation Presets** (13 curated):
- Gentle (3): Slow zoom, slight pan
- Dynamic (4): Fast zoom, dramatic pan
- Cinematic (3): Ken Burns, smooth transitions
- Dramatic (3): Quick zoom, bold pan

**Transitions** (9+ FFmpeg xfade): Fade, wipe, slide, dissolve, pixelize, radial, circle open/close

### 4. Advanced Caption System

**50+ Animation Styles**:
- Basic (6): static, fade, slide, scale
- Styled (32): bounce, typewriter, glow, shadow, gradient, neon, glitch, matrix, etc.
- Word Effects (8): pop, cascade, wave, pulse
- Special (5): karaoke, color shift, rotate, blur, perspective

**ASS Format Features**: Font styling, positioning, outline, shadow, word-level timing

### 5. Voice Cloning

ElevenLabs integration:
1. Upload 3-10 audio samples (10-30s each)
2. Automatic quality validation (SNR, speaker detection, clarity)
3. Language detection (29 languages)
4. Voice creation with unique ID
5. Use in TTS generation with speed/pitch/stability controls

### 6. AI Model Preferences (4-Tier Resolution)

Hierarchical model selection:
1. **System Default** (lowest): Hardcoded platform defaults (FLUX Schnell, GPT-4 Turbo, OpenAI TTS)
2. **Admin Default**: Platform-wide defaults per purpose type
3. **User Preference**: Per-user overrides
4. **Project Override** (highest): Per-project model selection

**Purpose Types**: text-generation, image-generation, video-generation, tts-generation

**Cost Optimization Examples**:
- Image: FLUX Schnell ($0.003) vs DALL-E 3 ($0.040) = 13x cheaper
- Text: Gemini Flash ($0.35/M) vs GPT-4 ($10/M) = 28x cheaper
- TTS: OpenAI ($15/1M chars) vs ElevenLabs ($300/1M chars)

### 7. Project Variations (A/B Testing)

Test different pipeline configurations:
- Model comparison (GPT-4 vs Claude vs Gemini)
- Visual style testing (photorealistic vs illustration vs 3D)
- Cost optimization (premium vs balanced vs budget)
- Narration voice testing (different providers/voices)
- Pacing & music variations

**Workflow**: Create base project → create variations with config overrides → generate all → review/compare → select winner

**Evaluation Metrics**: Quality, creativity, brand fit (1-10 scale), cost per video, engagement metrics

---

## tRPC API Reference (25 Routers)

**Pipeline & Projects** (6 routers):
- `project` — List, create, update, delete, start pipeline, get progress, estimate cost (8 procedures)
- `ingestion` — List sources, extract content, validate, get metrics (5 procedures)
- `story` — Get, generate, regenerate, update, get scenes (5 procedures)
- `scene` — List, get, create, update, delete, reorder, duplicate (7 procedures)
- `pipeline` — Get status, advance, retry, cancel, logs, timeline (6 procedures)
- `job` — List, get, retry, cancel, queue metrics, clean (6 procedures)

**Media & Generation** (6 routers):
- `media` — List, get, upload, delete, update metadata, search (6 procedures)
- `mediaGeneration` — Generate, list, get, refine, conversation, estimate cost (6 procedures)
- `speechGeneration` — Generate, list, get, batch generate, estimate cost (5 procedures)
- `voice` — List voices, profiles, create/update/delete profile, test voice (6 procedures)
- `voiceClone` — Create, upload sample, list/delete samples, validate, submit, get status (7 procedures)
- `music` — List, search, get, upload, update, delete (6 procedures)

**Workflow & Automation** (4 routers):
- `agent` — List, get, create, update, delete, execute, list executions (7 procedures)
- `flow` — List, get, create, update, delete, duplicate, validate (7 procedures)
- `flowExecution` — Start, get status, cancel, get result, list, logs (6 procedures)
- `prompt` — List, get, create, update, delete, versions, rollback (7 procedures)

**Admin & Configuration** (7 routers):
- `adminProvider` — List, get, create, update, delete, test, usage (7 procedures, admin-only)
- `adminModel` — List, get, create, update, delete, set default, usage (7 procedures, admin-only)
- `pipelineConfig` — Get, update, reset, get defaults (4 procedures)
- `mediaOverride` — List, create, delete, update (4 procedures)
- `variation` — List, get, create, update, delete, score, mark winner, generate all (8 procedures)
- `userModelPreference` — List, get, upsert, delete, reset (5 procedures)
- `billing` — Get balance, transactions, usage, plans, subscribe, cancel, purchase credits (7 procedures)

**Stock Media** (1 router):
- `stockMedia` — Search, get collections, download, list providers, metrics (5 procedures)

**System** (1 router):
- `health` — Check, database status, Redis status, storage status, version (5 procedures)

**Total**: 25 routers, ~150 procedures

---

## Database Schema (43 Tables)

**Auth** (4 tables via better-auth):
- `user`, `session`, `account`, `verification`

**Pipeline** (24 tables):
- `projects`, `ingested_content`, `stories`, `scenes`
- `scene_visuals`, `scene_videos`, `scene_audio_mixes`
- `media_assets`, `music_tracks`
- `voice_profiles`, `cloned_voices`, `cloned_voice_samples`
- `speech_generations`, `generated_media`, `media_conversations`
- `pipeline_media_overrides`
- `ai_providers`, `ai_models`, `ai_generations`, `generation_jobs`
- `prompt_templates`, `prompt_template_versions`, `project_prompt_configs`
- `personas`

**Workflows** (5 tables):
- `agents`, `flows`, `flow_nodes`, `flow_edges`, `flow_executions`

**Billing** (4 tables):
- `subscription_plans`, `subscriptions`, `credit_balances`, `credit_transactions`

**Preferences** (2 tables):
- `user_model_preferences`, `project_variations`

**Key Relationships**:
- Projects → User (ownership)
- Stories → Projects
- Scenes → Stories
- Scene Visuals → Scenes
- AI Generations → User (tracking)
- Credit Transactions → User (billing)

---

## AI Integration

### Model Factory (`packages/ai/src/model-factory.ts`)

**Core Responsibilities**:
1. Provider selection based on capabilities (streaming, vision, function calling, context window)
2. Cost optimization routing (Gemini Flash for simple tasks vs GPT-4 for complex)
3. Automatic failover (primary → secondary → tertiary)
4. Usage tracking and credit deduction

**LLM Providers** (5):
- Anthropic Claude (creative writing): $3/$15 per 1M tokens
- OpenAI GPT-4 (general purpose): $10/$30 per 1M tokens
- Google Gemini (cost-effective): $0.35/$1.05 per 1M tokens
- Google Vertex AI (enterprise): $1.25/$5 per 1M tokens
- xAI Grok (real-time data)

**Image Providers** (3):
- OpenAI DALL-E 3: $0.040/image (high quality)
- Fal.ai FLUX Schnell: $0.003/image (13x cheaper!)
- Fal.ai Stable Diffusion: $0.005/image (customizable)

**Video Providers** (3):
- Google Veo: $0.10/second (high quality)
- Replicate AnimateDiff: $0.001/second
- Replicate Zeroscope: $0.002/second

**TTS Providers** (6):
- OpenAI: $15/1M chars (fast, natural)
- ElevenLabs: $300/1M chars (voice cloning, premium)
- Google Cloud: $4/1M chars (multilingual)
- Gemini: Free (experimental)
- Sarvam: $50/1M chars (Indic languages)
- Inworld: $200/1M chars (character voices)

---

## Frontend Architecture

### Dashboard Pages (15+)

**Main**:
- `/` — Dashboard (overview, activity, usage)
- `/projects` — Project list with folders
- `/projects/[id]` — Project detail (pipeline, scenes)
- `/projects/[id]/stories/[storyId]` — Story editor
- `/projects/[id]/stories/[storyId]/scenes/[sceneId]` — Scene editor

**Generation**:
- `/speech-generations` — TTS interface
- `/media-studio` — Multi-provider media generation
- `/media` — Asset library
- `/stock-media` — Stock media browser

**Configuration**:
- `/voices` — Voice profiles, cloning
- `/music` — Music library
- `/personas` — AI personas
- `/prompts` — Prompt templates
- `/variations` — A/B testing
- `/billing` — Credits, subscriptions
- `/settings` — User preferences

**Admin**:
- `/admin/providers` — AI provider config
- `/admin/models` — Model management
- `/admin/usage` — Platform analytics

---

## Development Workflow

### Adding a New Feature (Quick Guide)

1. **Schema**: Add columns to `packages/db/src/schema/`
2. **Push**: `pnpm db:push` (dev)
3. **Router**: Add procedure to `apps/api/src/trpc/routers/`
4. **Frontend**: Use tRPC hooks `api.*.useQuery()` / `api.*.useMutation()`
5. **Test**: `pnpm test`
6. **Validate**: `pnpm check`
7. **Commit**: `git commit -m "feat: description"`

---

## Testing & Quality

**Framework**: Vitest v4

**API Tests** (`apps/api/src/__tests__/`):
- Environment: Node.js
- Tests: Middleware, routers, services
- Mock: Database, auth, external APIs

**Web Tests** (`apps/web/src/__tests__/`):
- Environment: jsdom
- Tests: Components, hooks, utilities
- Libraries: @testing-library/react

**DO NOT TEST**: `apps/web/src/components/ui/` (shadcn generated)

**Commands**:
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage reports
```

---

## Deployment

### Production Checklist

**Environment**:
- Set all required env vars (see below)
- Enable `NODE_ENV=production`
- Rotate secrets regularly

**Database**:
- Run `pnpm db:migrate`
- Set up daily backups
- Verify health checks

**Redis**:
- Use managed Redis (Upstash recommended)
- Enable persistence (AOF/RDB)

**Storage**:
- Configure Cloudflare R2 bucket
- Set CORS for uploads
- Enable CDN

**Monitoring**:
- Sentry (errors)
- PostHog (analytics)
- BullMQ dashboard (password-protected)
- Uptime monitoring

**Security**:
- HTTPS only
- CSP headers
- Rate limiting
- CORS whitelist

---

## Environment Variables

**Database**:
- `DATABASE_URL` — PostgreSQL connection

**Redis**:
- `REDIS_URL` — Redis connection (or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)

**Auth**:
- `BETTER_AUTH_SECRET` — Session encryption key
- `BETTER_AUTH_URL` — API base URL

**API**:
- `CORS_ORIGIN` — Allowed origins (comma-separated)
- `NEXT_PUBLIC_API_URL` — Public API URL
- `PORT` — API port (default: 3001)

**AI Providers** (at least one required):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_VERTEX_PROJECT_ID`
- `XAI_API_KEY`

**TTS Providers** (optional):
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLOUD_TTS_API_KEY`
- `SARVAM_API_KEY`
- `INWORLD_API_KEY`

**Media Providers** (optional):
- `FAL_API_KEY`
- `REPLICATE_API_TOKEN`

**Stock Media** (optional):
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `PIXABAY_API_KEY`
- `STORYBLOCKS_API_KEY`

**Storage** (required):
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`
- `CLOUDFLARE_R2_PUBLIC_URL`

---

## Summary

ContentHQ is a comprehensive AI-powered content generation platform built with:
- **10-stage automated pipeline** (ingestion → final video)
- **Multi-provider AI** (5 LLM, 3 image, 3 video, 6 TTS providers)
- **Cost optimization** (13x cheaper with FLUX vs DALL-E)
- **Professional quality** (50+ caption styles, 13 animation presets, 9+ transitions)
- **Type-safe** (tRPC, Zod, TypeScript strict mode)
- **Production-ready** (Vercel deployment, monitoring, security)

**Tech Stack**: Next.js 15 + Hono + tRPC + BullMQ + PostgreSQL + Redis + Cloudflare R2 + FFmpeg

**Key Stats**:
- 25 tRPC routers (~150 procedures)
- 43 database tables
- 12 BullMQ workers
- 15+ dashboard pages
- 10 packages (9 functional + 1 config)

For detailed implementation, see inline code comments and test files.
