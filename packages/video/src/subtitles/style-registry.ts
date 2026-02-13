import type { AnimationStyleMeta } from "./types";

export const ANIMATION_STYLES: AnimationStyleMeta[] = [
  // Basic
  { id: "none", name: "None", description: "Standard subtitles without animation", category: "basic", requiresWordTiming: false },
  { id: "fade-in", name: "Fade In", description: "Text fades in from transparent", category: "basic", requiresWordTiming: false },
  { id: "slide-up", name: "Slide Up", description: "Text slides up from bottom", category: "basic", requiresWordTiming: false },
  { id: "slide-left", name: "Slide Left", description: "Text slides in from the right", category: "basic", requiresWordTiming: false },
  { id: "bounce", name: "Bounce", description: "Text bounces on appearance", category: "basic", requiresWordTiming: false },
  { id: "typewriter", name: "Typewriter", description: "Text appears letter by letter", category: "basic", requiresWordTiming: false },

  // Styled (ASS-based)
  { id: "tilted-emoji", name: "Tilted Emoji", description: "Alternating tilted text with random colored words", category: "styled", requiresWordTiming: false },
  { id: "sticker-word", name: "Sticker Word", description: "Rotated sticker popup with underline", category: "styled", requiresWordTiming: true },
  { id: "glow-bounce", name: "Glow Bounce", description: "Glowing text with bounce and tilt pattern", category: "styled", requiresWordTiming: true },
  { id: "imessage", name: "iMessage", description: "iOS-style blue message bubbles", category: "styled", requiresWordTiming: true },
  { id: "gold-3d", name: "Gold 3D", description: "Gold text with 3D shadow effect", category: "styled", requiresWordTiming: true },
  { id: "hormozi", name: "Hormozi", description: "Bold uppercase punchy text", category: "styled", requiresWordTiming: true },
  { id: "dual-font", name: "Dual Font", description: "Sans-serif and italic serif mix", category: "styled", requiresWordTiming: true },
  { id: "betelgeuse", name: "Betelgeuse", description: "White banner with black uppercase text", category: "styled", requiresWordTiming: true },
  { id: "daily-mail", name: "Daily Mail", description: "White uppercase with thick blue outline", category: "styled", requiresWordTiming: true },
  { id: "eclipse", name: "Eclipse", description: "Dark purple box with karaoke highlighting", category: "styled", requiresWordTiming: true },
  { id: "suzy", name: "Suzy", description: "Gold text with dark brown outline", category: "styled", requiresWordTiming: true },
  { id: "alcyone", name: "Alcyone", description: "Neon green karaoke in purple box", category: "styled", requiresWordTiming: true },
  { id: "thuban", name: "Thuban", description: "Yellow tilted banner with bounce", category: "styled", requiresWordTiming: true },
  { id: "marigold", name: "Marigold", description: "Elegant serif italic gold/white karaoke", category: "styled", requiresWordTiming: true },
  { id: "closed-caption", name: "Closed Caption", description: "Classic TV CC style", category: "styled", requiresWordTiming: false },
  { id: "handwritten-pop", name: "Handwritten Pop", description: "Script font word-by-word fade", category: "styled", requiresWordTiming: true },
  { id: "mizar", name: "Mizar", description: "Purple neon glow word-by-word", category: "styled", requiresWordTiming: true },
  { id: "poem", name: "Poem", description: "Elegant italic serif soft fade", category: "styled", requiresWordTiming: true },
  { id: "cartwheel-black", name: "Cartwheel Black", description: "Bold uppercase white/purple on black", category: "styled", requiresWordTiming: true },
  { id: "cartwheel-purple", name: "Cartwheel Purple", description: "Bold uppercase white/yellow on purple", category: "styled", requiresWordTiming: true },
  { id: "caster", name: "Caster", description: "Bold uppercase white/blue on light purple", category: "styled", requiresWordTiming: true },
  { id: "pulse", name: "Pulse", description: "Pop-in with scale overshoot", category: "styled", requiresWordTiming: true },
  { id: "fuel", name: "Fuel", description: "Brightness reveal with lime green highlights", category: "styled", requiresWordTiming: true },
  { id: "scene", name: "Scene", description: "Fade-in dissolve with golden yellow serif", category: "styled", requiresWordTiming: true },
  { id: "neon-glow", name: "Neon Glow", description: "Pink neon pop-in with word stacking", category: "styled", requiresWordTiming: true },
  { id: "drive", name: "Drive", description: "Clean fade-in with letter spacing", category: "styled", requiresWordTiming: true },
  { id: "freshly", name: "Freshly", description: "Karaoke word highlight in pill container", category: "styled", requiresWordTiming: true },
  { id: "slate", name: "Slate", description: "White rectangular background karaoke", category: "styled", requiresWordTiming: true },
  { id: "minima", name: "Minima", description: "Ultra-minimalist centered text with fade", category: "styled", requiresWordTiming: true },
  { id: "blueprint", name: "Blueprint", description: "Technical drawing style", category: "styled", requiresWordTiming: true },
  { id: "orbitar-black", name: "Orbitar Black", description: "Tilted pill boxes with karaoke", category: "styled", requiresWordTiming: true },

  // Word animations
  { id: "word-highlight", name: "Word Highlight", description: "Karaoke-style background box on current word", category: "word", requiresWordTiming: true },
  { id: "word-fill", name: "Word Fill", description: "Progressive color change that stays filled", category: "word", requiresWordTiming: true },
  { id: "word-color", name: "Word Color", description: "Current word changes color while spoken", category: "word", requiresWordTiming: true },
  { id: "word-color-box", name: "Word Color Box", description: "Current word gets colored background box", category: "word", requiresWordTiming: true },
  { id: "random-dual-color", name: "Random Dual Color", description: "Two random words highlighted with reveal", category: "word", requiresWordTiming: true },
  { id: "word-reveal", name: "Word Reveal", description: "Words appear one by one as spoken", category: "word", requiresWordTiming: true },
  { id: "stroke", name: "Stroke", description: "Outline first, fills with color when spoken", category: "word", requiresWordTiming: true },
  { id: "sticker", name: "Sticker", description: "Words appear with colored background sticker", category: "word", requiresWordTiming: true },

  // Effects
  { id: "fire-text", name: "Fire Text", description: "Flickering orange/red/yellow fire effect", category: "effect", requiresWordTiming: false },
  { id: "ice-text", name: "Ice Text", description: "Shimmering blue/cyan/white ice effect", category: "effect", requiresWordTiming: false },
  { id: "glitch", name: "Glitch", description: "RGB splitting and jitter glitch effect", category: "effect", requiresWordTiming: false },
  { id: "3d-extrude", name: "3D Extrude", description: "Multiple layers creating depth illusion", category: "effect", requiresWordTiming: false },
  { id: "retro-wave", name: "Retro Wave", description: "80s neon synthwave style", category: "effect", requiresWordTiming: false },
];

export const ANIMATION_STYLE_MAP = new Map<string, AnimationStyleMeta>(
  ANIMATION_STYLES.map((s) => [s.id, s])
);
