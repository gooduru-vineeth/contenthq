import {
  Download,
  Pencil,
  Layers,
  Image,
  ShieldCheck,
  Music,
  Film,
  GitBranch,
  Mic,
  Bot,
  Rss,
  Link,
  Settings,
  Cpu,
  Share2,
  Sparkles,
  CreditCard,
  FileText,
  Eye,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Nav Links ---
export interface NavLink {
  label: string;
  href: string;
}

export const landingNavLinks: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

// --- Pipeline Stages ---
export interface PipelineStage {
  name: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  color: string;
}

export const pipelineStages: PipelineStage[] = [
  {
    name: "Ingestion",
    description: "Import content from any source",
    detail:
      "Pull content from YouTube, RSS feeds, URLs, or generate from topics. AI ranks by engagement score.",
    icon: Download,
    color: "#6D28D9",
  },
  {
    name: "Story Writing",
    description: "AI crafts your narrative",
    detail:
      "Claude or GPT-4 generates structured narratives with scene breakdowns and audience targeting.",
    icon: Pencil,
    color: "#7C3AED",
  },
  {
    name: "Scene Generation",
    description: "Break into visual scenes",
    detail:
      "Stories split into scenes with descriptions, narration text, and motion instructions.",
    icon: Layers,
    color: "#8B5CF6",
  },
  {
    name: "Visual Generation",
    description: "Create stunning visuals",
    detail:
      "Multi-provider image and video generation with DALL-E, Fal.ai, Replicate, and more.",
    icon: Image,
    color: "#A78BFA",
  },
  {
    name: "Visual Verification",
    description: "AI quality assurance",
    detail:
      "Vision models validate visuals for relevance, quality, consistency, and safety. Auto-retry if score <60%.",
    icon: ShieldCheck,
    color: "#2563EB",
  },
  {
    name: "Audio Layering",
    description: "Add voice and music",
    detail:
      "Generate TTS narration from 6 providers, mix with background music using intelligent audio ducking.",
    icon: Music,
    color: "#3B82F6",
  },
  {
    name: "Assembly",
    description: "Final video output",
    detail:
      "Combine video timeline with mixed audio, add captions and branding for the final polished video.",
    icon: Film,
    color: "#60A5FA",
  },
];

// --- Features ---
export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const features: Feature[] = [
  {
    title: "Visual Flow Builder",
    description:
      "React Flow-based workflow programming with 8 node types for custom automation pipelines.",
    icon: GitBranch,
  },
  {
    title: "6 TTS Providers",
    description:
      "OpenAI, ElevenLabs, Google Cloud, Gemini, Sarvam, and Inworld — find the perfect voice.",
    icon: Mic,
  },
  {
    title: "Multi-Provider AI",
    description:
      "Anthropic, OpenAI, Google, xAI with intelligent selection and automatic failover.",
    icon: Bot,
  },
  {
    title: "Media Generation Studio",
    description:
      "Create images, videos, and audio with AI conversations for iterative refinement.",
    icon: Sparkles,
  },
  {
    title: "Content Ingestion",
    description:
      "Import from YouTube, RSS, URLs, or topics. AI ranks content by engagement score.",
    icon: Rss,
  },
  {
    title: "AI Verification",
    description:
      "Vision models validate visuals for relevance, quality, consistency, and safety.",
    icon: Eye,
  },
  {
    title: "Credit System",
    description:
      "Transparent pay-as-you-go billing with real-time cost estimation before generation.",
    icon: CreditCard,
  },
  {
    title: "Prompt Versioning",
    description:
      "Version-controlled prompt templates with variable interpolation and A/B testing.",
    icon: FileText,
  },
];

// --- How It Works ---
export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    step: 1,
    title: "Import Content",
    description:
      "Connect YouTube channels, RSS feeds, or paste any URL. AI extracts and ranks content automatically.",
    icon: Link,
  },
  {
    step: 2,
    title: "Configure Pipeline",
    description:
      "Choose your AI providers, voice, visual style, and branding. Use presets or build custom flows.",
    icon: Settings,
  },
  {
    step: 3,
    title: "AI Does the Work",
    description:
      "Our 7-stage pipeline writes, generates visuals, narrates, and assembles your video automatically.",
    icon: Cpu,
  },
  {
    step: 4,
    title: "Publish Anywhere",
    description:
      "Download your polished video or publish directly to YouTube, TikTok, and social platforms.",
    icon: Share2,
  },
];

// --- Pricing ---
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  credits: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out ContentHQ",
    credits: "50 credits",
    features: [
      "50 credits included",
      "3 projects",
      "All 7 pipeline stages",
      "2 AI providers",
      "720p video output",
      "Community support",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    description: "For individual creators",
    credits: "500 credits/mo",
    features: [
      "500 credits/month",
      "Unlimited projects",
      "All 7 pipeline stages",
      "All AI providers",
      "1080p video output",
      "Voice cloning",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    price: "$99",
    period: "per month",
    description: "For teams and agencies",
    credits: "2,500 credits/mo",
    features: [
      "2,500 credits/month",
      "Unlimited projects",
      "Visual Flow Builder",
      "All AI & TTS providers",
      "4K video output",
      "Custom personas & prompts",
      "Priority processing",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "per month",
    description: "For large-scale operations",
    credits: "Unlimited credits",
    features: [
      "Unlimited credits",
      "Everything in Pro",
      "Dedicated infrastructure",
      "Custom AI model training",
      "SLA guarantee",
      "Dedicated success manager",
      "SSO & SAML",
      "Custom integrations",
    ],
    cta: "Talk to Sales",
  },
];

// --- FAQ ---
export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "What is the AI content pipeline?",
    answer:
      "ContentHQ uses a 7-stage automated pipeline to transform raw content into polished videos. It handles ingestion, story writing, scene generation, visual creation, quality verification, audio layering, and final assembly — all powered by AI.",
  },
  {
    question: "Which AI providers do you support?",
    answer:
      "We support Anthropic (Claude), OpenAI (GPT-4), Google (Gemini), xAI (Grok) for text generation. For images, we use DALL-E, Fal.ai, and Replicate. For TTS, we offer OpenAI, ElevenLabs, Google Cloud, Gemini, Sarvam, and Inworld.",
  },
  {
    question: "How do credits work?",
    answer:
      "Credits are consumed when you use AI services. Each action has a transparent cost — you can see the estimated credits before confirming. Free accounts start with 50 credits, and paid plans include monthly credit allowances.",
  },
  {
    question: "Can I use my own API keys?",
    answer:
      "Yes! Enterprise plans allow you to bring your own API keys for any supported provider. This gives you full control over costs and rate limits while still using our pipeline infrastructure.",
  },
  {
    question: "Is my content secure?",
    answer:
      "Absolutely. ContentHQ uses multi-tenant architecture with complete data isolation. Your content, API keys, and generated assets are encrypted and never shared between accounts.",
  },
  {
    question: "Do you support team collaboration?",
    answer:
      "Yes. Pro and Enterprise plans support team workspaces with role-based access control, shared projects, and collaborative editing of flows and prompt templates.",
  },
  {
    question: "What video formats and resolutions are supported?",
    answer:
      "We support MP4, AVI, MOV, and MKV formats. Resolution depends on your plan: Free supports 720p, Starter supports 1080p, Pro supports 4K, and Enterprise supports custom resolutions.",
  },
  {
    question: "Can I customize the visual style of my videos?",
    answer:
      "Yes! Use AI personas to define visual styles, create custom prompt templates for consistent branding, and use the Visual Flow Builder for complete pipeline customization.",
  },
];

// --- Testimonials ---
export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Content Director",
    company: "MediaFlow",
    quote:
      "ContentHQ cut our video production time by 80%. The AI pipeline is incredibly accurate and the quality verification step ensures nothing subpar goes out.",
    initials: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "Founder",
    company: "CreatorStack",
    quote:
      "The Visual Flow Builder is a game-changer. We built custom content workflows that would have taken months to develop manually.",
    initials: "MR",
  },
  {
    name: "Emily Watson",
    role: "Head of Marketing",
    company: "GrowthLabs",
    quote:
      "Six TTS providers in one platform means we always find the perfect voice. The multi-language support has been essential for our global campaigns.",
    initials: "EW",
  },
  {
    name: "David Kim",
    role: "VP of Content",
    company: "NexGen Media",
    quote:
      "We went from 2 videos a week to 20. The automated pipeline handles everything from script to final edit. Our team focuses on strategy now.",
    initials: "DK",
  },
  {
    name: "Priya Patel",
    role: "Product Manager",
    company: "ScaleUp AI",
    quote:
      "The multi-provider AI failover means zero downtime. We've never missed a deadline since switching to ContentHQ.",
    initials: "PP",
  },
];

// --- Stats ---
export interface Stat {
  value: string;
  label: string;
}

export const heroStats: Stat[] = [
  { value: "7", label: "Pipeline Stages" },
  { value: "6", label: "TTS Providers" },
  { value: "5+", label: "LLM Providers" },
  { value: "<5 min", label: "Avg. Generation" },
];

export const tickerStats: Stat[] = [
  { value: "10K+", label: "Videos Generated" },
  { value: "500+", label: "Active Creators" },
  { value: "99.9%", label: "Uptime" },
  { value: "7", label: "AI Pipeline Stages" },
  { value: "6", label: "TTS Providers" },
  { value: "5+", label: "LLM Providers" },
  { value: "4K", label: "Max Resolution" },
  { value: "40+", label: "Languages" },
];

// --- Trusted By ---
export interface TrustedCompany {
  name: string;
  initials: string;
}

export const trustedCompanies: TrustedCompany[] = [
  { name: "MediaFlow", initials: "MF" },
  { name: "CreatorStack", initials: "CS" },
  { name: "GrowthLabs", initials: "GL" },
  { name: "NexGen Media", initials: "NM" },
  { name: "ScaleUp AI", initials: "SA" },
  { name: "ContentPro", initials: "CP" },
];

// --- Integrations ---
export interface Integration {
  name: string;
  category: "ai" | "tts" | "source";
  abbreviation: string;
}

export const integrations: Integration[] = [
  { name: "Anthropic", category: "ai", abbreviation: "An" },
  { name: "OpenAI", category: "ai", abbreviation: "OA" },
  { name: "Google AI", category: "ai", abbreviation: "Go" },
  { name: "xAI", category: "ai", abbreviation: "xA" },
  { name: "Fal.ai", category: "ai", abbreviation: "Fa" },
  { name: "Replicate", category: "ai", abbreviation: "Re" },
  { name: "OpenAI TTS", category: "tts", abbreviation: "OT" },
  { name: "ElevenLabs", category: "tts", abbreviation: "EL" },
  { name: "Google Cloud", category: "tts", abbreviation: "GC" },
  { name: "Gemini TTS", category: "tts", abbreviation: "GT" },
  { name: "Sarvam AI", category: "tts", abbreviation: "Sv" },
  { name: "Inworld", category: "tts", abbreviation: "IW" },
  { name: "YouTube", category: "source", abbreviation: "YT" },
  { name: "RSS Feeds", category: "source", abbreviation: "RS" },
  { name: "URL Import", category: "source", abbreviation: "UR" },
  { name: "Topics", category: "source", abbreviation: "Tp" },
];

// --- Media Studio bullets ---
export interface MediaStudioBullet {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const mediaStudioBullets: MediaStudioBullet[] = [
  {
    title: "Multi-Turn Conversations",
    description: "Refine outputs with AI conversations, not one-shot prompts.",
    icon: Bot,
  },
  {
    title: "Real-Time Cost Estimation",
    description:
      "See credit costs before generating. No surprise bills.",
    icon: CreditCard,
  },
  {
    title: "Smart Prompt Suggestions",
    description:
      "AI suggests improvements to get better results on every generation.",
    icon: Lightbulb,
  },
];
