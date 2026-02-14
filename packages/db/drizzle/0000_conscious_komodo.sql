CREATE TYPE "public"."ai_provider_type" AS ENUM('llm', 'image', 'video', 'tts', 'music', 'vision', 'embedding');--> statement-breakpoint
CREATE TYPE "public"."credit_reservation_status" AS ENUM('active', 'settled', 'released', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."media_generation_status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'audio', 'thumbnail');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'authorized', 'captured', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."persona_category" AS ENUM('tone', 'audience', 'visual_style', 'narrative_style');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_stage_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'ingesting', 'writing', 'generating_scenes', 'generating_visuals', 'verifying', 'generating_tts', 'generating_video', 'mixing_audio', 'generating_captions', 'assembling', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."prompt_type" AS ENUM('story_writing', 'scene_generation', 'image_generation', 'image_refinement', 'visual_verification');--> statement-breakpoint
CREATE TYPE "public"."scene_status" AS ENUM('outlined', 'scripted', 'visual_generated', 'visual_verified', 'video_generated', 'audio_mixed', 'caption_generated', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."bonus_credit_source" AS ENUM('promotional', 'referral', 'compensation', 'loyalty', 'trial', 'admin_grant', 'signup_bonus');--> statement-breakpoint
CREATE TYPE "public"."credit_alert_type" AS ENUM('low_balance', 'balance_depleted', 'bonus_expiring', 'bonus_expired');--> statement-breakpoint
CREATE TYPE "public"."subscription_change_type" AS ENUM('created', 'upgraded', 'downgraded', 'cancelled', 'reactivated');--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"input_type" text,
	"input_content" text,
	"aspect_ratio" text DEFAULT '16:9',
	"target_duration" integer DEFAULT 60,
	"tone" text DEFAULT 'professional',
	"language" text DEFAULT 'en',
	"voice_profile_id" text,
	"music_track_id" text,
	"final_video_url" text,
	"enable_video_generation" boolean DEFAULT false NOT NULL,
	"thumbnail_url" text,
	"progress_percent" integer DEFAULT 0,
	"total_credits_used" integer DEFAULT 0,
	"pipeline_template_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"hook" text,
	"synopsis" text,
	"narrative_arc" jsonb,
	"scene_count" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"ai_model_used" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"story_id" text NOT NULL,
	"project_id" text NOT NULL,
	"index" integer NOT NULL,
	"status" "scene_status" DEFAULT 'outlined' NOT NULL,
	"visual_description" text,
	"image_prompt" text,
	"narration_script" text,
	"motion_spec" jsonb,
	"transitions" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_visuals" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"image_url" text,
	"storage_key" text,
	"prompt" text,
	"verified" boolean DEFAULT false,
	"verification_score" integer,
	"verification_details" jsonb,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_videos" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"video_url" text,
	"storage_key" text,
	"duration" integer,
	"voiceover_url" text,
	"tts_provider" text,
	"tts_voice_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_audio_mixes" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"mixed_audio_url" text,
	"storage_key" text,
	"duration" integer,
	"voiceover_volume" integer DEFAULT 100,
	"music_volume" integer DEFAULT 30,
	"music_ducking_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingested_content" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"source_url" text,
	"source_platform" text,
	"title" text,
	"body" text,
	"summary" text,
	"engagement_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "ai_provider_type" NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"rate_limit_per_minute" integer,
	"cost_per_unit" numeric,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"model_id" text NOT NULL,
	"type" text,
	"is_default" boolean DEFAULT false,
	"costs" jsonb,
	"capabilities" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"provider_id" text,
	"model_id" text,
	"type" text,
	"input" jsonb,
	"output" jsonb,
	"tokens" integer,
	"cost_usd" numeric,
	"latency_ms" integer,
	"prompt_template_id" text,
	"agent_id" text,
	"composed_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"job_type" text NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0,
	"config" jsonb,
	"result" jsonb,
	"progress_percent" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"type" "media_type" NOT NULL,
	"url" text,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" integer,
	"dimensions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"genre" text,
	"category" text,
	"mood" text,
	"bpm" integer,
	"duration" integer,
	"url" text,
	"storage_key" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"provider_voice_id" text NOT NULL,
	"voice_id" text NOT NULL,
	"language" text,
	"gender" text,
	"preview_url" text,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"balance" integer DEFAULT 0,
	"reserved_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_credits_received" integer DEFAULT 0 NOT NULL,
	"lifetime_credits_used" integer DEFAULT 0 NOT NULL,
	"bonus_balance" integer DEFAULT 0 NOT NULL,
	"low_balance_threshold" integer,
	"low_balance_notified_at" timestamp with time zone,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credit_balances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"job_id" text,
	"project_id" text,
	"operation_type" text,
	"provider" text,
	"model" text,
	"admin_user_id" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_input_tokens" integer,
	"input_token_cost" numeric(10, 6),
	"output_token_cost" numeric(10, 6),
	"actual_cost_credits" numeric(10, 2),
	"billed_cost_credits" numeric(10, 2),
	"cost_multiplier" numeric(4, 2),
	"cost_breakdown" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"monthly_credits" integer NOT NULL,
	"price" numeric NOT NULL,
	"price_inr" integer DEFAULT 0 NOT NULL,
	"price_usd" integer DEFAULT 0 NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'monthly' NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"bonus_credits" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"popular" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"features" jsonb,
	"limits" jsonb,
	"rate_limits" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"credits_granted" integer NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"plan_snapshot" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "prompt_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"output_schema_hint" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"version" integer NOT NULL,
	"type" "prompt_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"output_schema_hint" jsonb,
	"edited_by" text,
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "persona_category" NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"prompt_fragment" text NOT NULL,
	"created_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"ui_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"version" integer NOT NULL,
	"category" "persona_category" NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"prompt_fragment" text NOT NULL,
	"ui_config" jsonb,
	"edited_by" text,
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_prompt_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"prompt_overrides" jsonb DEFAULT '{}'::jsonb,
	"persona_selections" jsonb DEFAULT '{}'::jsonb,
	"custom_variables" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_prompt_configs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"agent_type" text NOT NULL,
	"ai_model_id" text,
	"model_config" jsonb,
	"prompt_template_id" text,
	"system_prompt" text,
	"output_config" jsonb,
	"persona_selections" jsonb DEFAULT '{}'::jsonb,
	"expected_variables" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active',
	"version" integer DEFAULT 1 NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agent_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by" text,
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"flow_data" jsonb NOT NULL,
	"config" jsonb,
	"version" integer DEFAULT 1,
	"status" text DEFAULT 'active',
	"is_default" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "flow_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_node_id" text,
	"node_log" jsonb DEFAULT '[]'::jsonb,
	"input_data" jsonb,
	"output_data" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_flow_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"node_overrides" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_flow_configs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "speech_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"title" text,
	"input_text" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"voice_id" text NOT NULL,
	"voice_settings" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"audio_file_url" text,
	"audio_file_key" text,
	"audio_format" text,
	"duration_ms" integer,
	"file_size_bytes" integer,
	"cost_usd" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"parent_generation_id" text,
	"batch_id" text,
	"flow_execution_id" text,
	"flow_node_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "generated_media" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text,
	"project_id" text,
	"media_type" "media_type" DEFAULT 'image' NOT NULL,
	"prompt" text NOT NULL,
	"revised_prompt" text,
	"media_url" text,
	"storage_key" text,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"aspect_ratio" text DEFAULT '1:1' NOT NULL,
	"quality" text DEFAULT 'standard' NOT NULL,
	"style" text,
	"width" integer,
	"height" integer,
	"duration" integer,
	"file_size" integer,
	"mime_type" text DEFAULT 'image/png',
	"generation_time_ms" integer,
	"status" "media_generation_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb,
	"flow_execution_id" text,
	"flow_node_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"initial_prompt" text NOT NULL,
	"model" text NOT NULL,
	"media_type" text DEFAULT 'image' NOT NULL,
	"message_count" integer DEFAULT 1 NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"generated_media_id" text,
	"model" text,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloned_voices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"language" text NOT NULL,
	"provider_voice_id" text,
	"provider_voice_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tags" jsonb,
	"remove_background_noise" text DEFAULT 'false',
	"validation_results" jsonb,
	"error_message" text,
	"preview_url" text,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloned_voice_samples" (
	"id" text PRIMARY KEY NOT NULL,
	"cloned_voice_id" text NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"transcription" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"mode" text DEFAULT 'simple' NOT NULL,
	"stage_configs" jsonb DEFAULT '{}'::jsonb,
	"frozen_config" jsonb,
	"frozen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_configs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "pipeline_media_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"stage" text NOT NULL,
	"scene_index" integer,
	"override_type" text NOT NULL,
	"media_asset_id" text,
	"url" text,
	"storage_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"output_type" text DEFAULT 'ai_video' NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_config" jsonb DEFAULT '{}'::jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"template_id" text,
	"template_slug" text,
	"status" "pipeline_run_status" DEFAULT 'pending' NOT NULL,
	"frozen_config" jsonb,
	"current_stage_id" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_run_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"status" "pipeline_run_stage_status" DEFAULT 'pending' NOT NULL,
	"job_count" integer DEFAULT 0 NOT NULL,
	"completed_jobs" integer DEFAULT 0 NOT NULL,
	"failed_jobs" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_variations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"stage_overrides" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"final_video_url" text,
	"credits_used" integer DEFAULT 0,
	"evaluation_scores" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_model_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose_type" text NOT NULL,
	"ai_model_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_model_preferences_user_id_purpose_type_unique" UNIQUE("user_id","purpose_type")
);
--> statement-breakpoint
CREATE TABLE "credit_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"amount" integer NOT NULL,
	"operation_type" text NOT NULL,
	"status" "credit_reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "credit_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"credits" integer NOT NULL,
	"price_inr" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"description" text,
	"popular" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credit_pack_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_order_id" text,
	"external_payment_id" text,
	"credits" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"provider_data" jsonb,
	"idempotency_key" text NOT NULL,
	"credit_transaction_id" text,
	"failure_reason" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "bonus_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_amount" integer NOT NULL,
	"remaining_amount" integer NOT NULL,
	"source" "bonus_credit_source" NOT NULL,
	"description" text,
	"campaign_id" text,
	"expires_at" timestamp with time zone,
	"is_expired" boolean DEFAULT false,
	"granted_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_usage_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"total_requests" integer DEFAULT 0,
	"total_credits_used" integer DEFAULT 0,
	"total_cost_usd" numeric(10, 4),
	"operation_breakdown" jsonb,
	"provider_breakdown" jsonb,
	"model_breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "credit_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "credit_alert_type" NOT NULL,
	"threshold" integer,
	"current_balance" integer,
	"notified" boolean DEFAULT false,
	"notified_at" timestamp with time zone,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"user_id" text NOT NULL,
	"change_type" "subscription_change_type" NOT NULL,
	"from_plan_id" text,
	"to_plan_id" text,
	"reason" text,
	"effective_date" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_visuals" ADD CONSTRAINT "scene_visuals_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_videos" ADD CONSTRAINT "scene_videos_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_audio_mixes" ADD CONSTRAINT "scene_audio_mixes_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingested_content" ADD CONSTRAINT "ingested_content_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_prompt_template_id_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_prompt_configs" ADD CONSTRAINT "project_prompt_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_ai_model_id_ai_models_id_fk" FOREIGN KEY ("ai_model_id") REFERENCES "public"."ai_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_prompt_template_id_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_flow_configs" ADD CONSTRAINT "project_flow_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_flow_configs" ADD CONSTRAINT "project_flow_configs_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_generations" ADD CONSTRAINT "speech_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speech_generations" ADD CONSTRAINT "speech_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_media" ADD CONSTRAINT "generated_media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_media" ADD CONSTRAINT "generated_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_conversations" ADD CONSTRAINT "media_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_conversation_messages" ADD CONSTRAINT "media_conversation_messages_conversation_id_media_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."media_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_conversation_messages" ADD CONSTRAINT "media_conversation_messages_generated_media_id_generated_media_id_fk" FOREIGN KEY ("generated_media_id") REFERENCES "public"."generated_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloned_voices" ADD CONSTRAINT "cloned_voices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloned_voice_samples" ADD CONSTRAINT "cloned_voice_samples_cloned_voice_id_cloned_voices_id_fk" FOREIGN KEY ("cloned_voice_id") REFERENCES "public"."cloned_voices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloned_voice_samples" ADD CONSTRAINT "cloned_voice_samples_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_configs" ADD CONSTRAINT "pipeline_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_configs" ADD CONSTRAINT "pipeline_configs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_media_overrides" ADD CONSTRAINT "pipeline_media_overrides_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_media_overrides" ADD CONSTRAINT "pipeline_media_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_media_overrides" ADD CONSTRAINT "pipeline_media_overrides_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_template_id_pipeline_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_run_stages" ADD CONSTRAINT "pipeline_run_stages_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_variations" ADD CONSTRAINT "project_variations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_variations" ADD CONSTRAINT "project_variations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_model_preferences" ADD CONSTRAINT "user_model_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_model_preferences" ADD CONSTRAINT "user_model_preferences_ai_model_id_ai_models_id_fk" FOREIGN KEY ("ai_model_id") REFERENCES "public"."ai_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_reservations" ADD CONSTRAINT "credit_reservations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_credit_pack_id_credit_packs_id_fk" FOREIGN KEY ("credit_pack_id") REFERENCES "public"."credit_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_credits" ADD CONSTRAINT "bonus_credits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_usage_summaries" ADD CONSTRAINT "daily_usage_summaries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_alerts" ADD CONSTRAINT "credit_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stories_project_id_idx" ON "stories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scenes_story_id_idx" ON "scenes" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "scenes_project_id_idx" ON "scenes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scenes_project_id_index_idx" ON "scenes" USING btree ("project_id","index");--> statement-breakpoint
CREATE INDEX "scene_visuals_scene_id_idx" ON "scene_visuals" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_videos_scene_id_idx" ON "scene_videos" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_audio_mixes_scene_id_idx" ON "scene_audio_mixes" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "ingested_content_project_id_idx" ON "ingested_content" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_generations_user_id_idx" ON "ai_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_generations_project_id_idx" ON "ai_generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_generations_created_at_idx" ON "ai_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_project_id_idx" ON "generation_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_user_id_idx" ON "generation_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_assets_user_id_idx" ON "media_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_project_id_idx" ON "media_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "credit_balances_user_id_idx" ON "credit_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_project_id_idx" ON "credit_transactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_operation_type_idx" ON "credit_transactions" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prompt_templates_type_idx" ON "prompt_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "prompt_templates_created_by_idx" ON "prompt_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "prompt_templates_type_created_by_active_idx" ON "prompt_templates" USING btree ("type","created_by","is_active");--> statement-breakpoint
CREATE INDEX "prompt_templates_type_version_idx" ON "prompt_templates" USING btree ("type","version");--> statement-breakpoint
CREATE INDEX "prompt_template_versions_template_id_idx" ON "prompt_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "prompt_template_versions_template_id_version_idx" ON "prompt_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "personas_category_idx" ON "personas" USING btree ("category");--> statement-breakpoint
CREATE INDEX "personas_created_by_idx" ON "personas" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "personas_category_created_by_idx" ON "personas" USING btree ("category","created_by");--> statement-breakpoint
CREATE INDEX "persona_versions_persona_id_idx" ON "persona_versions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "persona_versions_persona_id_version_idx" ON "persona_versions" USING btree ("persona_id","version");--> statement-breakpoint
CREATE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agents_agent_type_idx" ON "agents" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_versions_agent_id_idx" ON "agent_versions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_versions_agent_id_version_idx" ON "agent_versions" USING btree ("agent_id","version");--> statement-breakpoint
CREATE INDEX "flows_slug_idx" ON "flows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "flows_status_idx" ON "flows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "flow_executions_flow_id_idx" ON "flow_executions" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_executions_project_id_idx" ON "flow_executions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "flow_executions_status_idx" ON "flow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "speech_generations_user_id_idx" ON "speech_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "speech_generations_project_id_idx" ON "speech_generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "speech_generations_status_idx" ON "speech_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "speech_generations_batch_id_idx" ON "speech_generations" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "generated_media_user_id_idx" ON "generated_media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_media_conversation_id_idx" ON "generated_media" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "generated_media_project_id_idx" ON "generated_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generated_media_status_idx" ON "generated_media" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_media_created_at_idx" ON "generated_media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cloned_voices_user_id_idx" ON "cloned_voices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cloned_voices_status_idx" ON "cloned_voices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cloned_voice_samples_cloned_voice_id_idx" ON "cloned_voice_samples" USING btree ("cloned_voice_id");--> statement-breakpoint
CREATE INDEX "cloned_voice_samples_user_id_idx" ON "cloned_voice_samples" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pipeline_configs_project_id_idx" ON "pipeline_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pipeline_configs_user_id_idx" ON "pipeline_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pipeline_media_overrides_project_id_idx" ON "pipeline_media_overrides" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pipeline_media_overrides_stage_idx" ON "pipeline_media_overrides" USING btree ("project_id","stage");--> statement-breakpoint
CREATE INDEX "pipeline_runs_project_id_idx" ON "pipeline_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_status_idx" ON "pipeline_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pipeline_run_stages_run_id_idx" ON "pipeline_run_stages" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "pipeline_run_stages_stage_id_idx" ON "pipeline_run_stages" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "pipeline_run_stages_run_id_stage_id_idx" ON "pipeline_run_stages" USING btree ("run_id","stage_id");--> statement-breakpoint
CREATE INDEX "project_variations_project_id_idx" ON "project_variations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_variations_user_id_idx" ON "project_variations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_reservations_user_id_idx" ON "credit_reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_reservations_status_idx" ON "credit_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_orders_user_id_idx" ON "payment_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_orders_external_order_id_idx" ON "payment_orders" USING btree ("external_order_id");--> statement-breakpoint
CREATE INDEX "payment_orders_idempotency_key_idx" ON "payment_orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "bonus_credits_user_id_idx" ON "bonus_credits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bonus_credits_expires_at_idx" ON "bonus_credits" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "daily_usage_summaries_user_id_idx" ON "daily_usage_summaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_usage_summaries_date_idx" ON "daily_usage_summaries" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_usage_summaries_user_date_idx" ON "daily_usage_summaries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "credit_alerts_user_id_idx" ON "credit_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_alerts_type_idx" ON "credit_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_alerts_resolved_idx" ON "credit_alerts" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "subscription_changes_subscription_id_idx" ON "subscription_changes" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_changes_user_id_idx" ON "subscription_changes" USING btree ("user_id");