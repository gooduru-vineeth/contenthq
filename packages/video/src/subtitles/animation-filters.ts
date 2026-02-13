import type { SubtitleSegment } from "./types";
import { escapeFFmpegText, convertBGRtoHex } from "./helpers";

const BG_COLOR_MAP: Record<string, string> = {
  none: "",
  black: ":box=1:boxcolor=black@0.5:boxborderw=8",
  "solid-black": ":box=1:boxcolor=black@1:boxborderw=8",
  white: ":box=1:boxcolor=white@0.5:boxborderw=8",
  "solid-white": ":box=1:boxcolor=white@1:boxborderw=8",
  gray: ":box=1:boxcolor=gray@0.5:boxborderw=8",
  "dark-gray": ":box=1:boxcolor=0x404040@0.5:boxborderw=8",
  blue: ":box=1:boxcolor=blue@0.5:boxborderw=8",
  red: ":box=1:boxcolor=red@0.5:boxborderw=8",
  green: ":box=1:boxcolor=green@0.5:boxborderw=8",
  yellow: ":box=1:boxcolor=yellow@0.5:boxborderw=8",
  purple: ":box=1:boxcolor=purple@0.5:boxborderw=8",
};

export function createAnimationFilter(
  subtitle: SubtitleSegment,
  font: string,
  color: string,
  position: string,
  bgColor: string,
  animation: string,
  fontSize: number,
  _index: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const duration = endTime - startTime;
  const lineHeight = Math.round(fontSize * 1.3);

  const textColor = convertBGRtoHex(color);

  let lines = [text];
  if (wordsPerLine > 0) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    lines = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, Math.min(i + wordsPerLine, words.length)).join(" "));
    }
  }

  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;

  const boxStyle = BG_COLOR_MAP[bgColor] || "";
  const escapedFont = escapeFFmpegText(font);

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalHeight})/2`;
  } else {
    baseY = `h-${totalHeight}-50`;
  }

  const filters: string[] = [];
  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    switch (animation) {
      case "fade-in":
        filters.push(
          `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y=${lineY}:alpha='if(lt(t-${startTime},0.5),(t-${startTime})/0.5,1)':borderw=2:bordercolor=black${boxStyle}:enable='between(t,${startTime},${endTime})'`
        );
        break;

      case "slide-up":
        filters.push(
          `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y='(h-50)+((${lineY})-(h-50))*min(1\\,(t-${startTime})/0.8)':borderw=2:bordercolor=black${boxStyle}:enable='between(t,${startTime},${endTime})'`
        );
        break;

      case "slide-left":
        filters.push(
          `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x='(w)+((w-text_w)/2-(w))*min(1\\,(t-${startTime})/0.8)':y=${lineY}:borderw=2:bordercolor=black${boxStyle}:enable='between(t,${startTime},${endTime})'`
        );
        break;

      case "bounce":
        filters.push(
          `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y='(${lineY})-if(lt(t-${startTime}\\,0.5)\\,30*sin(6*(t-${startTime}))\\,0)':borderw=2:bordercolor=black${boxStyle}:enable='between(t,${startTime},${endTime})'`
        );
        break;

      case "typewriter": {
        const typeDuration = Math.min(duration * 0.8, Math.max(0.5, line.length * 0.08));
        filters.push(
          `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x=(w-text_w)/2:y=${lineY}:alpha='min(1\\,(t-${startTime})/${typeDuration})':borderw=2:bordercolor=black${boxStyle}:enable='between(t,${startTime},${endTime})'`
        );
        break;
      }
    }
  });

  return filters.length > 0 ? filters.join(",") : null;
}
