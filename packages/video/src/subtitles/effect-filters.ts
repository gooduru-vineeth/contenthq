import type { SubtitleSegment } from "./types";
import { escapeFFmpegText } from "./helpers";

function splitIntoLines(text: string, wordsPerLine: number): string[] {
  if (wordsPerLine <= 0) return [text];
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, Math.min(i + wordsPerLine, words.length)).join(" "));
  }
  return lines;
}

function calculateBaseY(
  position: string,
  totalHeight: number
): number | string {
  if (position.includes("top")) {
    return 50;
  } else if (position.includes("middle")) {
    return `(h-${totalHeight})/2`;
  }
  return `h-${totalHeight}-50`;
}

export function createFireTextFilter(
  subtitle: SubtitleSegment,
  font: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const lineHeight = Math.round(fontSize * 1.3);
  const escapedFont = escapeFFmpegText(font);

  const lines = wordsPerLine > 0 ? splitIntoLines(text, wordsPerLine) : [text];
  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;
  const baseY = calculateBaseY(position, totalHeight);

  const fireColors = ["0xff4500", "0xff6600", "0xffcc00", "0xff8c00", "0xff0000"];
  const filters: string[] = [];

  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    fireColors.forEach((_color, colorIndex) => {
      const flickerSpeed = 0.15;
      const offset = colorIndex * flickerSpeed;
      const cycleDuration = fireColors.length * flickerSpeed;

      filters.push(
        `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${fireColors[colorIndex]}:x=(w-text_w)/2:y=${lineY}:borderw=3:bordercolor=0x8b0000:shadowy=2:shadowx=2:shadowcolor=0x330000:alpha='if(lt(mod(t-${startTime}+${offset}\\,${cycleDuration})\\,${flickerSpeed})\\,1\\,0)':enable='between(t,${startTime},${endTime})'`
      );
    });

    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0xff6600:x=(w-text_w)/2:y=${lineY}:borderw=4:bordercolor=0x8b0000:alpha=0.3:enable='between(t,${startTime},${endTime})'`
    );
  });

  return filters.join(",");
}

export function createIceTextFilter(
  subtitle: SubtitleSegment,
  font: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const lineHeight = Math.round(fontSize * 1.3);
  const escapedFont = escapeFFmpegText(font);

  const lines = wordsPerLine > 0 ? splitIntoLines(text, wordsPerLine) : [text];
  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;
  const baseY = calculateBaseY(position, totalHeight);

  const iceColors = ["0xffffff", "0x87ceeb", "0x00bfff", "0xb0e0e6", "0x00ffff"];
  const filters: string[] = [];

  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    iceColors.forEach((_color, colorIndex) => {
      const shimmerSpeed = 0.12;
      const offset = colorIndex * shimmerSpeed;
      const cycleDuration = iceColors.length * shimmerSpeed;

      filters.push(
        `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${iceColors[colorIndex]}:x=(w-text_w)/2:y=${lineY}:borderw=3:bordercolor=0x4169e1:shadowy=1:shadowx=1:shadowcolor=0x000080:alpha='if(lt(mod(t-${startTime}+${offset}\\,${cycleDuration})\\,${shimmerSpeed})\\,1\\,0)':enable='between(t,${startTime},${endTime})'`
      );
    });

    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0x87ceeb:x=(w-text_w)/2:y=${lineY}:borderw=4:bordercolor=0x4682b4:alpha=0.3:enable='between(t,${startTime},${endTime})'`
    );
  });

  return filters.join(",");
}

export function createGlitchFilter(
  subtitle: SubtitleSegment,
  font: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const lineHeight = Math.round(fontSize * 1.3);
  const escapedFont = escapeFFmpegText(font);

  const lines = wordsPerLine > 0 ? splitIntoLines(text, wordsPerLine) : [text];
  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;
  const baseY = calculateBaseY(position, totalHeight);

  const filters: string[] = [];

  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    // Red channel - offset left with random jitter
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0xff0000@0.7:x=(w-text_w)/2-4+2*sin(t*30):y=${lineY}+2*cos(t*25):enable='between(t,${startTime},${endTime})'`
    );

    // Green channel - offset right with different jitter
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0x00ff00@0.7:x=(w-text_w)/2+4+2*cos(t*35):y=${lineY}+2*sin(t*20):enable='between(t,${startTime},${endTime})'`
    );

    // Blue channel - slight offset with jitter
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0x0000ff@0.7:x=(w-text_w)/2+2*sin(t*40):y=${lineY}-2+2*cos(t*30):enable='between(t,${startTime},${endTime})'`
    );

    // Main white text on top
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0xffffff:x=(w-text_w)/2:y=${lineY}:borderw=1:bordercolor=black:enable='between(t,${startTime},${endTime})'`
    );

    // Random glitch flashes
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0x00ffff:x=(w-text_w)/2+8*sin(t*50):y=${lineY}:alpha='if(lt(mod(t*10\\,1)\\,0.1)\\,0.8\\,0)':enable='between(t,${startTime},${endTime})'`
    );
  });

  return filters.join(",");
}

export function create3DExtrudeFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const lineHeight = Math.round(fontSize * 1.3);
  const escapedFont = escapeFFmpegText(font);

  const lines = wordsPerLine > 0 ? splitIntoLines(text, wordsPerLine) : [text];
  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;
  const baseY = calculateBaseY(position, totalHeight);

  const filters: string[] = [];
  const extrudeDepth = 8;

  const shadowColors: string[] = [];
  for (let i = extrudeDepth; i >= 1; i--) {
    const shade = Math.floor(30 + i * 15);
    shadowColors.push(
      `0x${shade.toString(16).padStart(2, "0")}${shade.toString(16).padStart(2, "0")}${shade.toString(16).padStart(2, "0")}`
    );
  }

  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    for (let i = extrudeDepth; i >= 1; i--) {
      const offsetX = i * 2;
      const offsetY = i * 2;
      const color = shadowColors[extrudeDepth - i];

      filters.push(
        `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2+${offsetX}:y=${lineY}+${offsetY}:enable='between(t,${startTime},${endTime})'`
      );
    }

    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=(w-text_w)/2:y=${lineY}:borderw=1:bordercolor=0x000000:enable='between(t,${startTime},${endTime})'`
    );
  });

  return filters.join(",");
}

export function createRetroWaveFilter(
  subtitle: SubtitleSegment,
  font: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const { text, startTime, endTime } = subtitle;
  const lineHeight = Math.round(fontSize * 1.3);
  const escapedFont = escapeFFmpegText(font);

  const lines = wordsPerLine > 0 ? splitIntoLines(text, wordsPerLine) : [text];
  const totalLines = lines.length;
  const totalHeight = totalLines * lineHeight;
  const baseY = calculateBaseY(position, totalHeight);

  const filters: string[] = [];
  const neonColors = ["0xff00ff", "0x00ffff", "0xff00aa", "0xaa00ff"];

  lines.forEach((line, lineIndex) => {
    const escapedText = escapeFFmpegText(line);
    const yOffset = lineIndex * lineHeight;
    const lineY = typeof baseY === "string" ? `${baseY}+${yOffset}` : baseY + yOffset;

    // Cyan glow layer (back)
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0x00ffff@0.5:x=(w-text_w)/2+3:y=${lineY}+3:enable='between(t,${startTime},${endTime})'`
    );

    // Magenta glow layer
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0xff00ff@0.5:x=(w-text_w)/2-2:y=${lineY}-2:enable='between(t,${startTime},${endTime})'`
    );

    // Pulsing neon effect
    neonColors.forEach((_color, colorIndex) => {
      const pulseSpeed = 0.2;
      const offset = colorIndex * pulseSpeed;
      const cycleDuration = neonColors.length * pulseSpeed;

      filters.push(
        `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${neonColors[colorIndex]}:x=(w-text_w)/2:y=${lineY}:borderw=2:bordercolor=0x000000:alpha='if(lt(mod(t-${startTime}+${offset}\\,${cycleDuration})\\,${pulseSpeed})\\,1\\,0)':enable='between(t,${startTime},${endTime})'`
      );
    });

    // Chrome/metallic highlight on top
    filters.push(
      `drawtext=text='${escapedText}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=0xffffff@0.3:x=(w-text_w)/2:y=${lineY}-1:enable='between(t,${startTime},${endTime})'`
    );
  });

  return filters.join(",");
}
