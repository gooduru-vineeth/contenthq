"use client";

import { useFormContext } from "react-hook-form";
import type { CreateProjectInput } from "@contenthq/shared";
import { cn } from "@/lib/utils";

const CAPTION_STYLES = [
  {
    id: "none",
    name: "Classic",
    description: "Clean white text with outline",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "11px",
        textShadow:
          "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
        fontFamily: "sans-serif",
        textTransform: "uppercase" as const,
      },
    },
  },
  {
    id: "closed-caption",
    name: "Closed Caption",
    description: "Text on solid black box",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#ffffff",
        fontWeight: 400,
        fontSize: "10px",
        fontFamily: "monospace",
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: "2px 6px",
        borderRadius: "2px",
      },
    },
  },
  {
    id: "hormozi",
    name: "Hormozi",
    description: "Bold with highlighted word",
    preview: {
      text: "The quick ",
      highlight: "BROWN",
      highlightStyle: {
        backgroundColor: "#facc15",
        color: "#000",
        padding: "0 3px",
        borderRadius: "2px",
      },
      after: " fox",
      style: {
        color: "#ffffff",
        fontWeight: 900,
        fontSize: "12px",
        textTransform: "uppercase" as const,
        fontFamily: "sans-serif",
        textShadow:
          "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
      },
    },
  },
  {
    id: "imessage",
    name: "iMessage",
    description: "Blue bubble containers",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#ffffff",
        fontWeight: 500,
        fontSize: "10px",
        fontFamily: "sans-serif",
        backgroundColor: "#007AFF",
        padding: "4px 10px",
        borderRadius: "14px",
      },
    },
  },
  {
    id: "neon-glow",
    name: "Neon Glow",
    description: "Glowing neon text",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#ff6ec7",
        fontWeight: 700,
        fontSize: "11px",
        fontFamily: "sans-serif",
        textShadow:
          "0 0 5px #ff6ec7, 0 0 10px #ff6ec7, 0 0 20px #ff1493, 0 0 30px #ff1493",
      },
    },
  },
  {
    id: "freshly",
    name: "Freshly",
    description: "Dark pill with karaoke fill",
    preview: {
      text: "The quick ",
      highlight: "brown",
      highlightStyle: {
        color: "#22d3ee",
      },
      after: " fox",
      style: {
        color: "#ffffff",
        fontWeight: 600,
        fontSize: "10px",
        fontFamily: "sans-serif",
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: "4px 10px",
        borderRadius: "20px",
      },
    },
  },
  {
    id: "word-highlight",
    name: "Word Highlight",
    description: "One word with gold background",
    preview: {
      text: "The quick ",
      highlight: "brown",
      highlightStyle: {
        backgroundColor: "#d97706",
        color: "#fff",
        padding: "0 3px",
        borderRadius: "3px",
      },
      after: " fox",
      style: {
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "11px",
        fontFamily: "sans-serif",
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
      },
    },
  },
  {
    id: "word-color",
    name: "Word Color",
    description: "Accent-colored word pop",
    preview: {
      text: "The quick ",
      highlight: "brown",
      highlightStyle: {
        color: "#38bdf8",
      },
      after: " fox",
      style: {
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "11px",
        fontFamily: "sans-serif",
        textShadow:
          "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
      },
    },
  },
  {
    id: "fire-text",
    name: "Fire Text",
    description: "Orange-red gradient text",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        fontWeight: 900,
        fontSize: "12px",
        fontFamily: "sans-serif",
        background: "linear-gradient(to top, #f97316, #ef4444, #eab308)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        textShadow: "none",
        filter: "drop-shadow(0 0 4px rgba(249,115,22,0.5))",
      },
    },
  },
  {
    id: "retro-wave",
    name: "Retro Wave",
    description: "Magenta with cyan shadow",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#e879f9",
        fontWeight: 800,
        fontSize: "11px",
        fontFamily: "sans-serif",
        textShadow: "2px 2px 0 #06b6d4, -1px -1px 0 #06b6d4",
        textTransform: "uppercase" as const,
      },
    },
  },
  {
    id: "typewriter",
    name: "Typewriter",
    description: "Monospace with cursor",
    preview: {
      text: "The quick brown fox",
      highlight: "|",
      highlightStyle: {
        color: "#ffffff",
        opacity: 0.7,
      },
      style: {
        color: "#e2e8f0",
        fontWeight: 400,
        fontSize: "10px",
        fontFamily: "monospace",
        letterSpacing: "0.05em",
      },
    },
  },
  {
    id: "gold-3d",
    name: "Gold 3D",
    description: "Gold text with depth",
    preview: {
      text: "The quick brown fox",
      highlight: null,
      style: {
        color: "#fbbf24",
        fontWeight: 900,
        fontSize: "12px",
        fontFamily: "sans-serif",
        textTransform: "uppercase" as const,
        textShadow:
          "1px 1px 0 #92400e, 2px 2px 0 #78350f, 3px 3px 2px rgba(0,0,0,0.5)",
      },
    },
  },
] as const;

const POSITIONS = [
  { value: "top-center", label: "Top" },
  { value: "middle-center", label: "Middle" },
  { value: "bottom-center", label: "Bottom" },
];

interface PreviewStyle {
  text: string;
  highlight: string | null;
  highlightStyle?: React.CSSProperties;
  after?: string;
  style: React.CSSProperties;
}

function StylePreview({ preview }: { preview: PreviewStyle }) {
  return (
    <span style={preview.style}>
      {preview.text}
      {preview.highlight && (
        <span style={preview.highlightStyle}>{preview.highlight}</span>
      )}
      {preview.after}
    </span>
  );
}

export function CaptionStyleSelector() {
  const form = useFormContext<CreateProjectInput>();
  const selectedStyle = form.watch("captionStyle") ?? "none";
  const selectedPosition = form.watch("captionPosition") ?? "bottom-center";

  return (
    <div className="space-y-4">
      {/* Style Grid */}
      <div>
        <p className="text-sm font-medium mb-2">Caption Style</p>
        <div className="grid grid-cols-3 gap-2">
          {CAPTION_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              className={cn(
                "flex flex-col rounded-lg border transition-all text-left overflow-hidden",
                selectedStyle === style.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => form.setValue("captionStyle", style.id)}
            >
              {/* Preview area */}
              <div className="flex items-center justify-center bg-zinc-900 aspect-video p-2">
                <StylePreview preview={style.preview as PreviewStyle} />
              </div>
              {/* Label */}
              <div className="p-2">
                <p className="text-xs font-medium leading-tight">
                  {style.name}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {style.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Position Selector */}
      <div>
        <p className="text-sm font-medium mb-2">Caption Position</p>
        <div className="flex gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selectedPosition === pos.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground"
              )}
              onClick={() => form.setValue("captionPosition", pos.value)}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
