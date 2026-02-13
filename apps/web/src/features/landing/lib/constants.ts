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
  Palette,
  Sparkles,
  CreditCard,
  FileText,
  Eye,
  Lightbulb,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Nav Links ---
export interface NavLink {
  label: string;
  href: string;
}

export const landingNavLinks: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#pipeline" },
  { label: "Examples", href: "#media-studio" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

// --- Pipeline Stages ---
export interface PipelineStage {
  name: string;
  description: string;
  detail: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
  /** Brighter variant used in dark mode for visibility */
  darkColor: string;
}

export const pipelineStages: PipelineStage[] = [
  {
    name: "Import",
    description: "Bring in your content",
    detail:
      "Paste a YouTube link, share an article, enter a topic, or upload your own content. We handle the rest.",
    tagline: "Start with anything",
    icon: Download,
    color: "#0D1A63",
    darkColor: "#6B8CFF",
  },
  {
    name: "Write Script",
    description: "AI writes your story",
    detail:
      "Our AI transforms your content into a compelling, well-structured video script tailored to your audience.",
    tagline: "Words that connect",
    icon: Pencil,
    color: "#1A2CA3",
    darkColor: "#7B9AFF",
  },
  {
    name: "Storyboard",
    description: "Plan every scene",
    detail:
      "Your script is broken into perfectly-timed scenes with visual direction, narration cues, and smooth transitions.",
    tagline: "Scenes take shape",
    icon: Layers,
    color: "#2845D6",
    darkColor: "#8AABFF",
  },
  {
    name: "Create Visuals",
    description: "AI-generated imagery",
    detail:
      "AI creates stunning visuals for every scene — custom images, video clips, and graphics that match your brand and story.",
    tagline: "Visuals come alive",
    icon: Image,
    color: "#4F6FE4",
    darkColor: "#95B5FF",
  },
  {
    name: "Quality Check",
    description: "Every detail reviewed",
    detail:
      "AI reviews every image and clip to make sure it matches your story perfectly. Anything that doesn't meet the bar gets regenerated automatically.",
    tagline: "Quality guaranteed",
    icon: ShieldCheck,
    color: "#3A5ADC",
    darkColor: "#8DA8FF",
  },
  {
    name: "Add Voice & Music",
    description: "Professional audio",
    detail:
      "Choose from 50+ natural-sounding AI voices in 40+ languages. We layer in background music with professional-grade audio mixing.",
    tagline: "Voice meets music",
    icon: Music,
    color: "#6585E8",
    darkColor: "#A5C0FF",
  },
  {
    name: "Final Video",
    description: "Ready to publish",
    detail:
      "Everything comes together — video, voiceover, music, and captions — into a polished, ready-to-share video.",
    tagline: "Ready to share",
    icon: Film,
    color: "#8199ED",
    darkColor: "#B8CFFF",
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
    title: "Custom Workflows",
    description:
      "Build your own video creation process with our visual drag-and-drop editor. No coding needed.",
    icon: GitBranch,
  },
  {
    title: "50+ Natural AI Voices",
    description:
      "Choose from dozens of natural-sounding voices in 40+ languages. Find the perfect voice for your brand.",
    icon: Mic,
  },
  {
    title: "Best-in-Class AI",
    description:
      "We automatically use the best AI for each task — writing, visuals, voices — so your videos are always top quality.",
    icon: Bot,
  },
  {
    title: "Creative Studio",
    description:
      "Create custom images, videos, and graphics by chatting with AI. Refine until it's exactly what you want.",
    icon: Sparkles,
  },
  {
    title: "Import from Anywhere",
    description:
      "Start with a YouTube video, blog post, website, RSS feed, or just a topic idea. We work with what you have.",
    icon: Rss,
  },
  {
    title: "Automatic Quality Review",
    description:
      "Every visual is automatically reviewed by AI to make sure it matches your story. No more manual checking.",
    icon: Eye,
  },
  {
    title: "Simple Pay-As-You-Go",
    description:
      "See exactly what each video costs before you create it. Start free, upgrade when you're ready.",
    icon: CreditCard,
  },
  {
    title: "Smart Templates",
    description:
      "Save your favorite styles and settings as reusable templates. Keep your brand consistent across every video.",
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
    title: "Add Your Content",
    description:
      "Paste a YouTube link, share a blog post URL, or just type in a topic. ContentHQ takes it from there.",
    icon: Link,
  },
  {
    step: 2,
    title: "Choose Your Style",
    description:
      "Pick a voice, visual style, and tone — or use one of our ready-made presets to get started fast.",
    icon: Palette,
  },
  {
    step: 3,
    title: "AI Does the Work",
    description:
      "Our AI writes the script, generates visuals, records the voiceover, and assembles everything into a polished video.",
    icon: Sparkles,
  },
  {
    step: 4,
    title: "Publish Anywhere",
    description:
      "Download your finished video or share it directly to YouTube, TikTok, Instagram, and more.",
    icon: Share2,
  },
];

export interface StepAccent {
  /** Tailwind gradient classes for the icon background */
  iconGradient: string;
  /** CSS hex color for the glow radial-gradient */
  glowColor: string;
  /** Tailwind gradient classes for the accent bar */
  accentGradient: string;
  /** Idle float config — varied per card so they never sync */
  float: {
    y: [number, number, number];
    rotateX: [number, number, number];
    rotateY: [number, number, number];
    duration: number;
    delay: number;
  };
}

export const STEP_ACCENTS: StepAccent[] = [
  {
    iconGradient: "from-brand-600 to-brand-400",
    glowColor: "#2845D6",
    accentGradient: "from-brand-600 via-brand-500 to-brand-400",
    float: {
      y: [0, -7, 0],
      rotateX: [0, 1.2, 0],
      rotateY: [0, -0.8, 0],
      duration: 5.5,
      delay: 0,
    },
  },
  {
    iconGradient: "from-violet-600 to-violet-400",
    glowColor: "#7C3AED",
    accentGradient: "from-violet-600 via-violet-500 to-violet-400",
    float: {
      y: [0, -9, 0],
      rotateX: [0, -1, 0],
      rotateY: [0, 1.3, 0],
      duration: 6.2,
      delay: 0.4,
    },
  },
  {
    iconGradient: "from-orange-500 to-amber-400",
    glowColor: "#F68048",
    accentGradient: "from-orange-500 via-amber-400 to-amber-300",
    float: {
      y: [0, -6, 0],
      rotateX: [0, 0.8, 0],
      rotateY: [0, -1.1, 0],
      duration: 5.0,
      delay: 0.9,
    },
  },
  {
    iconGradient: "from-emerald-600 to-emerald-400",
    glowColor: "#10B981",
    accentGradient: "from-emerald-600 via-emerald-500 to-emerald-400",
    float: {
      y: [0, -8, 0],
      rotateX: [0, -1.3, 0],
      rotateY: [0, 0.7, 0],
      duration: 6.8,
      delay: 1.3,
    },
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
      "Full AI video creation",
      "5 AI voice options",
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
      "Full AI video creation",
      "50+ AI voice options",
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
      "Custom workflows",
      "All AI & voice options",
      "4K video output",
      "Brand templates & presets",
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
      "Single sign-on (SSO)",
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
    question: "How does ContentHQ create videos?",
    answer:
      "ContentHQ uses AI to handle every step of video creation. You provide the content — a link, article, or topic — and our platform writes the script, generates visuals, adds a natural voiceover, mixes in background music, and delivers a polished, ready-to-publish video.",
  },
  {
    question: "What kind of content can I turn into videos?",
    answer:
      "Almost anything! Paste a YouTube link, share a blog post or article URL, drop in an RSS feed, or simply type a topic idea. ContentHQ extracts the key information and transforms it into an engaging video script automatically.",
  },
  {
    question: "How do credits work?",
    answer:
      "Credits are consumed when you create videos. You can see the estimated cost before you start — no surprises. Free accounts start with 50 credits, and paid plans include monthly allowances. Credits roll over on paid plans.",
  },
  {
    question: "Do the AI voices sound natural?",
    answer:
      "Yes! We offer 50+ natural-sounding AI voices in over 40 languages. You can preview any voice before using it, adjust speed and tone, and even clone your own voice on paid plans for a truly personal touch.",
  },
  {
    question: "Is my content secure?",
    answer:
      "Absolutely. Your content, settings, and generated videos are private to your account and never shared. All data is encrypted and stored securely. Enterprise plans include additional compliance and security features.",
  },
  {
    question: "Do you support team collaboration?",
    answer:
      "Yes. Pro and Enterprise plans support team workspaces with shared projects, role-based permissions, and collaborative editing. Everyone on your team can create and manage videos together.",
  },
  {
    question: "What video formats and resolutions are supported?",
    answer:
      "We export videos in MP4 format, which works everywhere — YouTube, TikTok, Instagram, LinkedIn, and more. Resolution depends on your plan: Free supports 720p, Starter supports 1080p, Pro supports 4K, and Enterprise supports custom resolutions.",
  },
  {
    question: "Can I customize the look and feel of my videos?",
    answer:
      "Yes! Choose from ready-made style presets or create your own brand templates with custom colors, fonts, and visual styles. Save your settings as reusable templates to keep every video on-brand.",
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
      "ContentHQ cut our video production time by 80%. The quality is incredible — every video looks like it was made by a professional editor.",
    initials: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "Founder",
    company: "CreatorStack",
    quote:
      "We set up custom workflows in an afternoon and now produce 10x more content. It's like having an entire video production team on autopilot.",
    initials: "MR",
  },
  {
    name: "Emily Watson",
    role: "Head of Marketing",
    company: "GrowthLabs",
    quote:
      "The AI voices sound incredibly natural. We run campaigns in 12 languages now — something that was completely impossible before ContentHQ.",
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
    role: "Online Educator",
    company: "LearnWith Priya",
    quote:
      "As a teacher, I needed something simple. I type my lesson topic and get a professional video back in five minutes. My students love it.",
    initials: "PP",
  },
];

// --- Testimonial Accents ---
export interface TestimonialAccent {
  /** Tailwind gradient classes for the avatar circle */
  avatarGradient: string;
  /** RGB string for glow radial-gradient, e.g. "40, 69, 228" */
  glowColor: string;
  /** Tailwind fill/text classes for star rating */
  starColor: string;
  /** Tailwind gradient classes for accent bar at card top */
  accentGradient: string;
}

export const TESTIMONIAL_ACCENTS: TestimonialAccent[] = [
  {
    avatarGradient: "from-brand-700 to-brand-500",
    glowColor: "40, 69, 228",
    starColor: "fill-brand-400 text-brand-400",
    accentGradient: "from-brand-600 via-brand-500 to-brand-400",
  },
  {
    avatarGradient: "from-cta-600 to-cta-400",
    glowColor: "246, 128, 72",
    starColor: "fill-cta-400 text-cta-400",
    accentGradient: "from-cta-600 via-cta-500 to-cta-400",
  },
  {
    avatarGradient: "from-emerald-600 to-emerald-400",
    glowColor: "16, 185, 129",
    starColor: "fill-emerald-400 text-emerald-400",
    accentGradient: "from-emerald-600 via-emerald-500 to-emerald-400",
  },
  {
    avatarGradient: "from-violet-600 to-violet-400",
    glowColor: "139, 92, 246",
    starColor: "fill-violet-400 text-violet-400",
    accentGradient: "from-violet-600 via-violet-500 to-violet-400",
  },
  {
    avatarGradient: "from-rose-600 to-rose-400",
    glowColor: "244, 63, 94",
    starColor: "fill-rose-400 text-rose-400",
    accentGradient: "from-rose-600 via-rose-500 to-rose-400",
  },
];

// --- Stats ---
export interface Stat {
  value: string;
  label: string;
}

export const heroStats: Stat[] = [
  { value: "10K+", label: "Videos Created" },
  { value: "40+", label: "Languages" },
  { value: "<5 min", label: "Per Video" },
  { value: "500+", label: "Happy Creators" },
];

export const tickerStats: Stat[] = [
  { value: "10K+", label: "Videos Created" },
  { value: "500+", label: "Happy Creators" },
  { value: "99.9%", label: "Uptime" },
  { value: "50+", label: "Natural AI Voices" },
  { value: "<5 min", label: "Average Video Time" },
  { value: "24/7", label: "Always Available" },
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
  { name: "LearnWith Priya", initials: "LP" },
  { name: "ContentPro", initials: "CP" },
];

// --- Integrations ---
export interface Integration {
  name: string;
  category: "ai" | "source" | "publish";
  abbreviation: string;
}

export const integrations: Integration[] = [
  { name: "YouTube", category: "source", abbreviation: "YT" },
  { name: "Blog Posts", category: "source", abbreviation: "BP" },
  { name: "RSS Feeds", category: "source", abbreviation: "RS" },
  { name: "Any Website", category: "source", abbreviation: "WB" },
  { name: "YouTube", category: "publish", abbreviation: "YT" },
  { name: "TikTok", category: "publish", abbreviation: "TT" },
  { name: "Instagram", category: "publish", abbreviation: "IG" },
  { name: "LinkedIn", category: "publish", abbreviation: "LI" },
  { name: "OpenAI", category: "ai", abbreviation: "OA" },
  { name: "Google AI", category: "ai", abbreviation: "Go" },
  { name: "ElevenLabs", category: "ai", abbreviation: "EL" },
];

// --- AI Provider 3D Cards ---
export interface AIProvider {
  name: string;
  abbreviation: string;
  description: string;
  accentColor: string;
  floatDuration: number;
  floatDelay: number;
}

export const aiProviders: AIProvider[] = [
  {
    name: "OpenAI",
    abbreviation: "OA",
    description: "Language & Vision",
    accentColor: "#10A37F",
    floatDuration: 5,
    floatDelay: 0,
  },
  {
    name: "Anthropic",
    abbreviation: "An",
    description: "Advanced Reasoning",
    accentColor: "#D4A574",
    floatDuration: 5.5,
    floatDelay: 0.5,
  },
  {
    name: "Google AI",
    abbreviation: "Go",
    description: "Multimodal AI",
    accentColor: "#4285F4",
    floatDuration: 6,
    floatDelay: 1.0,
  },
  {
    name: "ElevenLabs",
    abbreviation: "EL",
    description: "Voice Synthesis",
    accentColor: "#6C5CE7",
    floatDuration: 4.5,
    floatDelay: 1.5,
  },
  {
    name: "Fal.ai",
    abbreviation: "Fa",
    description: "Image Generation",
    accentColor: "#FF6B6B",
    floatDuration: 5.2,
    floatDelay: 0.8,
  },
  {
    name: "Replicate",
    abbreviation: "Re",
    description: "Open Models",
    accentColor: "#0EA5E9",
    floatDuration: 5.8,
    floatDelay: 1.2,
  },
];

// --- Media Studio bullets ---
export interface MediaStudioBullet {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const mediaStudioBullets: MediaStudioBullet[] = [
  {
    title: "Chat to Create",
    description: "Describe what you want and refine it through conversation — not one-shot prompts.",
    icon: Bot,
  },
  {
    title: "Know the Cost Upfront",
    description:
      "See credit costs before generating. No surprise bills.",
    icon: CreditCard,
  },
  {
    title: "AI-Powered Suggestions",
    description:
      "AI suggests improvements to get better results on every generation.",
    icon: Lightbulb,
  },
];

// --- Media Studio Video Cards ---
export interface MediaStudioVideo {
  id: string;
  title: string;
  description: string;
  /** Duration label displayed on card, e.g. "0:30" */
  duration: string;
  /** CSS gradient for the thumbnail/poster state (light mode) */
  thumbnailGradient: string;
  /** CSS gradient for the thumbnail/poster state (dark mode) */
  thumbnailGradientDark: string;
  /** Accent color for glow and top bar (hex) */
  accentColor: string;
  /** Optional video source URL — graceful fallback to gradient when absent */
  videoSrc?: string;
}

export const mediaStudioVideos: MediaStudioVideo[] = [
  {
    id: "landscape-sunset",
    title: "Mountain Landscape",
    description: "Cinematic sunset with golden light",
    duration: "0:30",
    thumbnailGradient: "linear-gradient(135deg, #F68048, #FB9158, #FFA36B)",
    thumbnailGradientDark: "linear-gradient(135deg, #B84D20, #DC6530, #943B18)",
    accentColor: "#F68048",
  },
  {
    id: "ocean-waves",
    title: "Ocean Waves",
    description: "Aerial shot of turquoise waters",
    duration: "0:45",
    thumbnailGradient: "linear-gradient(135deg, #2845D6, #4F6FE4, #8199ED)",
    thumbnailGradientDark: "linear-gradient(135deg, #0D1A63, #1A2CA3, #142383)",
    accentColor: "#2845D6",
  },
  {
    id: "city-timelapse",
    title: "City Timelapse",
    description: "Urban skyline from day to night",
    duration: "1:00",
    thumbnailGradient: "linear-gradient(135deg, #6C5CE7, #A78BFA, #C4B5FD)",
    thumbnailGradientDark: "linear-gradient(135deg, #4C1D95, #6D28D9, #5B21B6)",
    accentColor: "#6C5CE7",
  },
  {
    id: "nature-macro",
    title: "Nature Close-Up",
    description: "Macro photography of morning dew",
    duration: "0:20",
    thumbnailGradient: "linear-gradient(135deg, #10B981, #34D399, #6EE7B7)",
    thumbnailGradientDark: "linear-gradient(135deg, #064E3B, #065F46, #047857)",
    accentColor: "#10B981",
  },
];
