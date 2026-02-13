import { formatASSTime } from "./helpers";
import type { SubtitleSegment, ASSGeneratorOptions } from "./types";

interface WordWithTiming {
  word: string;
  start: number;
  end: number;
}

const ALIGNMENT_MAP: Record<string, number> = {
  'top-left': 7, 'top-center': 8, 'top-right': 9,
  'middle-left': 4, 'middle-center': 5, 'middle-right': 6,
  'bottom-left': 1, 'bottom-center': 2, 'bottom-right': 3
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centisecs).padStart(2, '0')}`;
}

function extractAllWords(subtitleData: SubtitleSegment[]): WordWithTiming[] {
  const allWords: WordWithTiming[] = [];
  subtitleData.forEach(sub => {
    if (sub.wordTimings && sub.wordTimings.length > 0) {
      sub.wordTimings.forEach(wt => {
        allWords.push({ word: wt.word, start: wt.start, end: wt.end });
      });
    } else {
      const words = sub.text.split(/\s+/).filter(w => w.length > 0);
      const duration = sub.endTime - sub.startTime;
      const wordDuration = duration / words.length;
      words.forEach((word, i) => {
        allWords.push({
          word: word,
          start: sub.startTime + (i * wordDuration),
          end: sub.startTime + ((i + 1) * wordDuration)
        });
      });
    }
  });
  return allWords;
}

function segmentWordsByPattern(allWords: WordWithTiming[], wordPattern: number[]): { words: WordWithTiming[]; text: string; start: number; end: number }[] {
  const segments: { words: WordWithTiming[]; text: string; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length === 0) break;

    segments.push({
      words: segmentWords,
      text: segmentWords.map(w => w.word).join(' '),
      start: segmentWords[0].start,
      end: segmentWords[segmentWords.length - 1].end
    });

    wordIndex += wordsInSegment;
    patternIndex++;
  }
  return segments;
}

// 1. Tilted Color
export function generateTiltedColorASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize, position, textColor, wordsPerLine } = options;

  const highlightColors = [
    '&H00D7FF&',
    '&H00FF00&',
    '&HFF00FF&'
  ];

  const alignment = ALIGNMENT_MAP[position] || 2;
  const marginV = position.includes('middle') ? 0 : 50;

  const getRandomWordIndices = (wordCount: number): number[] => {
    if (wordCount <= 3) return Array.from({ length: wordCount }, (_, i) => i);
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * wordCount);
      if (!indices.includes(idx)) indices.push(idx);
    }
    return indices.sort((a, b) => a - b);
  };

  let assContent = `[Script Info]
Title: Tilted Color Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TiltCW,${font},${fontSize},${textColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,-15,1,3,1,${alignment},10,10,${marginV},1
Style: TiltCCW,${font},${fontSize},${textColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,15,1,3,1,${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  subtitleData.forEach((sub, index) => {
    const { text, startTime, endTime } = sub;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const start = formatASSTime(startTime);
    const end = formatASSTime(endTime);

    const styleName = index % 2 === 0 ? 'TiltCW' : 'TiltCCW';
    const highlightIndices = getRandomWordIndices(words.length);

    let styledText = '';
    words.forEach((word, i) => {
      const highlightIdx = highlightIndices.indexOf(i);
      if (highlightIdx !== -1) {
        styledText += `{\\c${highlightColors[highlightIdx]}}${word}{\\c${textColor}} `;
      } else {
        styledText += `${word} `;
      }
    });
    styledText = styledText.trim();

    if (wordsPerLine && wordsPerLine > 0 && words.length > wordsPerLine) {
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += wordsPerLine) {
        const lineWords = words.slice(i, Math.min(i + wordsPerLine, words.length));
        let lineText = '';
        lineWords.forEach((word, wi) => {
          const globalIdx = i + wi;
          const highlightIdx = highlightIndices.indexOf(globalIdx);
          if (highlightIdx !== -1) {
            lineText += `{\\c${highlightColors[highlightIdx]}}${word}{\\c${textColor}} `;
          } else {
            lineText += `${word} `;
          }
        });
        lines.push(lineText.trim());
      }
      styledText = lines.join('\\N');
    }

    const fadeTag = '{\\fad(500,0)}';
    assContent += `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${fadeTag}${styledText}\n`;
  });

  return assContent;
}

// 2. Sticker
export function generateStickerASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize, position, boxColor, wordsPerLine } = options;

  const convertToASSColor = (hexColor: string | undefined): string => {
    if (hexColor && hexColor.startsWith('0x')) {
      const rgb = hexColor.slice(2);
      const r = rgb.substr(0, 2);
      const g = rgb.substr(2, 2);
      const b = rgb.substr(4, 2);
      return `&H00${b}${g}${r}`.toUpperCase();
    }
    return '&H001C61D6';
  };

  const boxColorASS = convertToASSColor(boxColor);
  const alignment = ALIGNMENT_MAP[position] || 2;
  const marginV = position.includes('middle') ? 0 : 50;

  let assContent = `[Script Info]
Title: Sticker Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sticker,${font},${fontSize},&H00FFFFFF,&H00FFFFFF,${boxColorASS},&H00000000,-1,0,1,0,100,100,0,20,3,${Math.round(fontSize * 0.4)},0,${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  subtitleData.forEach((sub) => {
    const { text, startTime, endTime, wordTimings } = sub;

    if (wordsPerLine && wordsPerLine > 0) {
      const lines: string[] = [];
      const lineTimings: { start: number; end: number }[] = [];

      if (wordTimings && wordTimings.length > 0) {
        for (let i = 0; i < wordTimings.length; i += wordsPerLine) {
          const lineWords = wordTimings.slice(i, Math.min(i + wordsPerLine, wordTimings.length));
          lines.push(lineWords.map(w => w.word).join(' '));
          lineTimings.push({
            start: lineWords[0].start,
            end: endTime
          });
        }
      } else {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const duration = endTime - startTime;
        const linesCount = Math.ceil(words.length / wordsPerLine);
        const lineInterval = duration / linesCount;

        for (let i = 0; i < words.length; i += wordsPerLine) {
          lines.push(words.slice(i, Math.min(i + wordsPerLine, words.length)).join(' '));
          const lineIndex = Math.floor(i / wordsPerLine);
          lineTimings.push({
            start: startTime + (lineIndex * lineInterval * 0.3),
            end: endTime
          });
        }
      }

      lines.forEach((line, idx) => {
        const timing = lineTimings[idx];
        const start = formatASSTime(timing.start);
        const end = formatASSTime(timing.end);
        const lineBreaks = '\\N'.repeat(idx);
        assContent += `Dialogue: 0,${start},${end},Sticker,,0,0,0,,${lineBreaks}${line}\n`;
      });
    } else {
      const start = formatASSTime(startTime);
      const end = formatASSTime(endTime);
      assContent += `Dialogue: 0,${start},${end},Sticker,,0,0,0,,${text}\n`;
    }
  });

  return assContent;
}

// 3. Glow Bounce
export function generateGlowBounceASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize, position, glowColor, textColor } = options;

  const alignment = ALIGNMENT_MAP[position] || 2;
  const marginV = position.includes('middle') ? 0 : 50;

  const wordPatterns = [1, 4, 2];
  const tiltAngles = [15, -15, 0];

  let assContent = `[Script Info]
Title: Glow Bounce Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: GlowCCW,${font},${fontSize},${textColor},${glowColor},${glowColor},&H00000000,-1,0,0,0,100,100,0,15,1,4,2,${alignment},10,10,${marginV},1
Style: GlowCW,${font},${fontSize},${textColor},${glowColor},${glowColor},&H00000000,-1,0,0,0,100,100,0,-15,1,4,2,${alignment},10,10,${marginV},1
Style: GlowNormal,${font},${fontSize},${textColor},${glowColor},${glowColor},&H00000000,-1,0,0,0,100,100,0,0,1,4,2,${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  let wordIndex = 0;
  let segmentIndex = 0;

  while (wordIndex < allWords.length) {
    const patternIdx = segmentIndex % 3;
    const wordCount = wordPatterns[patternIdx];
    const tiltAngle = tiltAngles[patternIdx];

    const segmentWords = allWords.slice(wordIndex, wordIndex + wordCount);
    if (segmentWords.length === 0) break;

    const segmentText = segmentWords.map(w => w.word).join(' ');
    const startTime = segmentWords[0].start;
    const endTime = segmentWords[segmentWords.length - 1].end;

    const start = formatTime(startTime);
    const end = formatTime(endTime);

    let styleName: string;
    if (tiltAngle > 0) {
      styleName = 'GlowCCW';
    } else if (tiltAngle < 0) {
      styleName = 'GlowCW';
    } else {
      styleName = 'GlowNormal';
    }

    const bounceEffect = '{\\fscx80\\fscy80\\t(0,150,\\fscx115\\fscy115)\\t(150,300,\\fscx100\\fscy100)}';
    assContent += `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${bounceEffect}${segmentText}\n`;

    wordIndex += wordCount;
    segmentIndex++;
  }

  return assContent;
}

// 4. iMessage
export function generateIMessageASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize } = options;
  const fontSizeNum = fontSize || 36;

  const bubbleColorBGR = '&HFF840A&';
  const textColor = '&HFFFFFF&';
  const alignment = 3;
  const bubbleGap = Math.round(fontSizeNum * 3);
  const outlineSize = Math.round(fontSizeNum * 0.9);

  let assContent = `[Script Info]
Title: iMessage Bubbles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Bubble1,${font},${fontSizeNum},${textColor},&H000000FF,${bubbleColorBGR},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineSize},0,${alignment},20,80,80,1
Style: Bubble2,${font},${fontSizeNum},${textColor},&H000000FF,${bubbleColorBGR},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineSize},0,${alignment},20,80,${80 + bubbleGap},1
Style: Bubble3,${font},${fontSizeNum},${textColor},&H000000FF,${bubbleColorBGR},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineSize},0,${alignment},20,80,${80 + bubbleGap * 2},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const chunks: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < allWords.length; i += 3) {
    const chunkWords = allWords.slice(i, Math.min(i + 3, allWords.length));
    chunks.push({
      text: chunkWords.map(w => w.word).join(' '),
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end
    });
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const start = formatTime(chunk.start);
    const end = formatTime(chunk.end);
    const cyclePos = i % 3;
    const popIn = '{\\fscx75\\fscy75\\t(0,100,\\fscx105\\fscy105)\\t(100,180,\\fscx100\\fscy100)}';

    assContent += `Dialogue: 0,${start},${end},Bubble1,,0,0,0,,${popIn}${chunk.text}\n`;

    if (cyclePos >= 1 && i >= 1) {
      assContent += `Dialogue: 0,${start},${end},Bubble2,,0,0,0,,${chunks[i - 1].text}\n`;
    }

    if (cyclePos === 2 && i >= 2) {
      assContent += `Dialogue: 0,${start},${end},Bubble3,,0,0,0,,${chunks[i - 2].text}\n`;
    }
  }

  return assContent;
}

// 5. 3D Gold Text
export function generate3DGoldTextASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize, position } = options;
  const fontSizeNum = fontSize || 48;

  const goldColorBGR = '&H4BA9D4&';
  const shadowColorBGR = '&H28454A&';
  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 50;
  const lineGap = Math.round(fontSizeNum * 1.5);
  const shadowDepth = Math.round(fontSizeNum * 0.1);
  const isTop = position?.includes('top');
  const margin1 = baseMargin;
  const margin2 = baseMargin + lineGap;

  let assContent = `[Script Info]
Title: 3D Gold Text
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: GoldPrev,${font},${fontSizeNum},${goldColorBGR},&H000000FF,${shadowColorBGR},&H00000000,-1,1,0,0,100,100,1,0,1,4,${shadowDepth},${alignment},40,40,${isTop ? margin1 : margin2},1
Style: GoldCurr,${font},${fontSizeNum},${goldColorBGR},&H000000FF,${shadowColorBGR},&H00000000,-1,1,0,0,100,100,1,0,1,4,${shadowDepth},${alignment},40,40,${isTop ? margin2 : margin1},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const chunks: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < allWords.length; i += 3) {
    const chunkWords = allWords.slice(i, Math.min(i + 3, allWords.length));
    chunks.push({
      text: chunkWords.map(w => w.word).join(' '),
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end
    });
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const start = formatTime(chunk.start);
    const end = formatTime(chunk.end);

    const fadeIn = '{\\fad(120,0)}';

    if (i > 0) {
      assContent += `Dialogue: 0,${start},${end},GoldPrev,,0,0,0,,${chunks[i - 1].text}\n`;
    }

    assContent += `Dialogue: 0,${start},${end},GoldCurr,,0,0,0,,${fadeIn}${chunk.text}\n`;
  }

  return assContent;
}

// 6. Hormozi
export function generateHormoziASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { font, fontSize, position } = options;
  const fontSizeNum = fontSize || 72;

  const whiteColor = '&HFFFFFF&';
  const greenColor = '&H00FF00&';
  const blackOutline = '&H000000&';

  const alignment = ALIGNMENT_MAP[position] || 5;
  const marginV = position?.includes('middle') ? 0 : (position?.includes('top') ? 80 : 100);

  let assContent = `[Script Info]
Title: Hormozi Style
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HormoziMain,${font},${fontSizeNum},${whiteColor},&H000000FF,${blackOutline},&H00000000,-1,0,0,0,100,100,0,0,1,5,0,${alignment},40,40,${marginV},1
Style: HormoziGreen,${font},${fontSizeNum},${greenColor},&H000000FF,${blackOutline},&H00000000,-1,0,0,0,100,100,0,0,1,5,0,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const wordPattern = [2, 1, 3];
  const chunks: { text: string; start: number; end: number; wordCount: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInChunk = wordPattern[patternIndex % wordPattern.length];
    const chunkWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInChunk, allWords.length));
    if (chunkWords.length === 0) break;

    chunks.push({
      text: chunkWords.map(w => w.word).join(' '),
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end,
      wordCount: chunkWords.length
    });

    wordIndex += chunkWords.length;
    patternIndex++;
  }

  const getSlidePositions = (align: number, marginVert: number) => {
    let x: number, y: number;
    if ([1, 4, 7].includes(align)) {
      x = 100;
    } else if ([3, 6, 9].includes(align)) {
      x = 1820;
    } else {
      x = 960;
    }
    if ([7, 8, 9].includes(align)) {
      y = marginVert + fontSizeNum / 2;
    } else if ([4, 5, 6].includes(align)) {
      y = 540;
    } else {
      y = 1080 - marginVert - fontSizeNum / 2;
    }
    return { x, y };
  };

  const slideOffset = 200;
  const { x: finalX, y: finalY } = getSlidePositions(alignment, marginV);

  let oneWordGreenToggle = true;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const start = formatTime(chunk.start);
    const end = formatTime(chunk.end);

    const slideAndPunch = `{\\move(${finalX + slideOffset},${finalY},${finalX},${finalY},0,120)\\fscx120\\fscy120\\t(0,80,\\fscx100\\fscy100)}`;

    const words = chunk.text.toUpperCase().split(' ');
    let styledText: string;

    if (words.length === 1) {
      if (oneWordGreenToggle) {
        styledText = `{\\c${greenColor}}${words[0]}{\\c${whiteColor}}`;
      } else {
        styledText = words[0];
      }
      oneWordGreenToggle = !oneWordGreenToggle;
    } else {
      const greenIndex = Math.floor(Math.random() * words.length);
      styledText = words.map((word, idx) => {
        if (idx === greenIndex) {
          return `{\\c${greenColor}}${word}{\\c${whiteColor}}`;
        }
        return word;
      }).join(' ');
    }

    assContent += `Dialogue: 0,${start},${end},HormoziMain,,0,0,0,,${slideAndPunch}${styledText}\n`;
  }

  return assContent;
}

// 7. Dual Font
export function generateDualFontASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, wordsPerLine } = options;
  const fontSizeNum = fontSize || 48;

  const primaryFont = 'Arial';
  const secondaryFont = 'Georgia';

  const textColor = '&HFFFFFF&';
  const darkPurpleBg = '&HFF3D2A1A&';
  const outlineColor = '&H00000000&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 60;
  const boxPadding = Math.round(fontSizeNum * 0.35);

  const shouldEmphasize = (word: string, index: number, totalWords: number): boolean => {
    const cleanWord = word.replace(/[.,!?;:'"]/g, '');
    const isLongWord = cleanWord.length >= 5;
    const isThirdWord = (index + 1) % 3 === 0;
    const isLastWord = index === totalWords - 1 && totalWords > 2;
    return isLongWord || isThirdWord || isLastWord;
  };

  const styleWord = (word: string, index: number, totalWords: number): string => {
    const isEmphasis = shouldEmphasize(word, index, totalWords);
    if (isEmphasis) {
      return `{\\fn${secondaryFont}\\i1\\fs${Math.round(fontSizeNum * 1.05)}}${word}{\\fn${primaryFont}\\i0\\fs${fontSizeNum}}`;
    }
    return word;
  };

  let assContent = `[Script Info]
Title: Dual-Font Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DualFont,${primaryFont},${fontSizeNum},${textColor},&H000000FF,${outlineColor},${darkPurpleBg},0,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const effectiveWPL = wordsPerLine && wordsPerLine > 0 ? wordsPerLine : 4;
  const lines: { words: WordWithTiming[]; start: number; end: number }[] = [];
  for (let i = 0; i < allWords.length; i += effectiveWPL) {
    const lineWords = allWords.slice(i, Math.min(i + effectiveWPL, allWords.length));
    lines.push({
      words: lineWords,
      start: lineWords[0].start,
      end: lineWords[lineWords.length - 1].end
    });
  }

  lines.forEach((line, lineIndex) => {
    const lineWords = line.words;
    const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : null;

    let prevLineText = '';
    if (prevLine) {
      prevLineText = prevLine.words.map((w, i) =>
        styleWord(w.word, i, prevLine.words.length)
      ).join(' ');
    }

    lineWords.forEach((wordObj, wordIndex) => {
      let currentLineText = '';
      for (let i = 0; i <= wordIndex; i++) {
        const w = lineWords[i].word;
        currentLineText += styleWord(w, i, lineWords.length) + ' ';
      }
      currentLineText = currentLineText.trim();

      const startTime = wordObj.start;
      const endTime = wordIndex < lineWords.length - 1
        ? lineWords[wordIndex + 1].start
        : line.end;

      const start = formatTime(startTime);
      const end = formatTime(endTime);

      const fadeEffect = wordIndex === 0 ? '{\\fad(120,0)}' : '';

      let displayText: string;
      if (prevLine) {
        displayText = `${prevLineText}\\N${fadeEffect}${currentLineText}`;
      } else {
        displayText = `${fadeEffect}${currentLineText}`;
      }

      assContent += `Dialogue: 0,${start},${end},DualFont,,0,0,0,,${displayText}\n`;
    });
  });

  return assContent;
}

// 8. Betelgeuse
export function generateBetelgeuseASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 52;

  const primaryFont = 'Bebas Neue';
  const textColorVal = '&H00000000&';
  const whiteBg = '&H00FFFFFF&';
  const outlineColor = '&H00FFFFFF&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 80;
  const boxPadding = Math.round(fontSizeNum * 0.45);

  let assContent = `[Script Info]
Title: Betelgeuse Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Betelgeuse,${primaryFont},${fontSizeNum},${textColorVal},&H00000000&,${outlineColor},${whiteBg},0,0,0,0,100,100,3,0,4,${boxPadding},2,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const wordPattern = [1, 1, 1, 1, 4];
  const phrases: { words: WordWithTiming[]; text: string; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length === 0) break;

    phrases.push({
      words: segmentWords,
      text: segmentWords.map(w => w.word.toUpperCase()).join(' '),
      start: segmentWords[0].start,
      end: segmentWords[segmentWords.length - 1].end
    });

    wordIndex += segmentWords.length;
    patternIndex++;
  }

  phrases.forEach((phrase) => {
    const start = formatTime(phrase.start);
    const end = formatTime(phrase.end);
    const popEffect = '{\\fscx90\\fscy90\\t(0,80,\\fscx100\\fscy100)}';
    assContent += `Dialogue: 0,${start},${end},Betelgeuse,,0,0,0,,${popEffect}${phrase.text}\n`;
  });

  return assContent;
}

// 9. Daily Mail
export function generateDailyMailASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 64;

  const primaryFont = 'Arial Black';
  const textColorVal = '&H00FFFFFF&';
  const darkBlueOutline = '&H00800000&';
  const shadowColor = '&H80000000&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 70;
  const outlineSize = Math.round(fontSizeNum * 0.12);

  let assContent = `[Script Info]
Title: Daily Mail Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: DailyMail,${primaryFont},${fontSizeNum},${textColorVal},&H00FFFFFF&,${darkBlueOutline},${shadowColor},-1,0,0,0,100,100,1,0,1,${outlineSize},2,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  allWords.forEach((wordObj) => {
    const start = formatTime(wordObj.start);
    const end = formatTime(wordObj.end);
    const popEffect = '{\\fscx85\\fscy85\\t(0,60,\\fscx100\\fscy100)}';
    assContent += `Dialogue: 0,${start},${end},DailyMail,,0,0,0,,${popEffect}${wordObj.word.toUpperCase()}\n`;
  });

  return assContent;
}

// 10. Eclipse
export function generateEclipseASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, wordsPerLine } = options;
  const fontSizeNum = fontSize || 48;

  const primaryFont = 'Arial';
  const whiteColor = '&H00FFFFFF&';
  const dimPurple = '&H00CC9999&';
  const darkPurpleBg = '&H005C1F3D&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 60;
  const boxPadding = Math.round(fontSizeNum * 0.35);

  let assContent = `[Script Info]
Title: Eclipse Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Eclipse,${primaryFont},${fontSizeNum},${whiteColor},${dimPurple},&H00000000&,${darkPurpleBg},0,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const effectiveWPL = wordsPerLine && wordsPerLine > 0 ? wordsPerLine : 4;
  const wordsPerBlock = effectiveWPL * 2;

  const blocks: { words: WordWithTiming[]; start: number; end: number }[] = [];
  for (let i = 0; i < allWords.length; i += wordsPerBlock) {
    const blockWords = allWords.slice(i, Math.min(i + wordsPerBlock, allWords.length));
    blocks.push({
      words: blockWords,
      start: blockWords[0].start,
      end: blockWords[blockWords.length - 1].end
    });
  }

  blocks.forEach((block) => {
    const blockWords = block.words;
    const line1Words = blockWords.slice(0, effectiveWPL);
    const line2Words = blockWords.slice(effectiveWPL);

    blockWords.forEach((currentWord, wordIndex) => {
      const startTime = currentWord.start;
      const endTime = currentWord.end;

      let line1Text = '';
      line1Words.forEach((w, i) => {
        const globalIndex = i;
        if (globalIndex < wordIndex) {
          line1Text += `{\\c${whiteColor}}${w.word} `;
        } else if (globalIndex === wordIndex) {
          line1Text += `{\\c${whiteColor}\\b1}${w.word}{\\b0} `;
        } else {
          line1Text += `{\\c${dimPurple}}${w.word} `;
        }
      });
      line1Text = line1Text.trim();

      let line2Text = '';
      line2Words.forEach((w, i) => {
        const globalIndex = effectiveWPL + i;
        if (globalIndex < wordIndex) {
          line2Text += `{\\c${whiteColor}}${w.word} `;
        } else if (globalIndex === wordIndex) {
          line2Text += `{\\c${whiteColor}\\b1}${w.word}{\\b0} `;
        } else {
          line2Text += `{\\c${dimPurple}}${w.word} `;
        }
      });
      line2Text = line2Text.trim();

      let displayText: string;
      if (line2Text) {
        displayText = `${line1Text}\\N${line2Text}`;
      } else {
        displayText = line1Text;
      }

      const start = formatTime(startTime);
      const end = formatTime(endTime);
      assContent += `Dialogue: 0,${start},${end},Eclipse,,0,0,0,,${displayText}\n`;
    });
  });

  return assContent;
}

// 11. Suzy
export function generateSuzyASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize } = options;
  const fontSizeNum = fontSize || 56;

  const primaryFont = 'Georgia';
  const goldColor = '&H0000D4FF&';
  const darkBrownOutline = '&H001A1A4D&';
  const shadowColor = '&H00000033&';

  const alignment = 5;
  const baseMargin = 0;
  const outlineSize = Math.round(fontSizeNum * 0.08);

  let assContent = `[Script Info]
Title: Suzy Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Suzy,${primaryFont},${fontSizeNum},${goldColor},${goldColor},${darkBrownOutline},${shadowColor},-1,0,0,0,100,100,1,0,1,${outlineSize},3,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const toTitleCase = (str: string): string => {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [3, 4, 1, 1];
  const segments = segmentWordsByPattern(allWords, wordPattern).map(s => ({
    ...s,
    text: toTitleCase(s.text)
  }));

  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const popEffect = '{\\fscx95\\fscy95\\t(0,70,\\fscx100\\fscy100)}';
    assContent += `Dialogue: 0,${start},${end},Suzy,,0,0,0,,${popEffect}${segment.text}\n`;
  });

  return assContent;
}

// 12. Alcyone
export function generateAlcyoneASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 52;

  const primaryFont = 'Impact';
  const neonGreen = '&H0000FF00&';
  const whiteColor = '&H00FFFFFF&';
  const purpleBox = '&H00993399&';
  const blackShadow = '&H00000000&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 60;
  const shadowDepth = 4;

  let assContent = `[Script Info]
Title: Alcyone Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Alcyone,${primaryFont},${fontSizeNum},${whiteColor},${whiteColor},${blackShadow},${blackShadow},-1,-1,0,0,100,100,2,0,1,3,${shadowDepth},${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const wordPattern = [4, 3, 1, 1, 1];
  const segments: { words: WordWithTiming[]; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  segments.forEach((segment, segmentIndex) => {
    const segmentWords = segment.words;
    const rotation = segmentIndex % 2 === 0 ? -8 : 8;

    segmentWords.forEach((currentWord, wIdx) => {
      let displayText = `{\\frz${rotation}}`;
      segmentWords.forEach((w, i) => {
        const wordUpper = w.word.toUpperCase();
        if (i === wIdx) {
          displayText += `{\\c${neonGreen}\\3c${purpleBox}\\4c${purpleBox}\\bord8\\shad0}${wordUpper}{\\c${whiteColor}\\3c${blackShadow}\\4c${blackShadow}\\bord3\\shad${shadowDepth}} `;
        } else {
          displayText += `${wordUpper} `;
        }
      });
      displayText = displayText.trim();
      const start = formatTime(currentWord.start);
      const end = formatTime(currentWord.end);
      assContent += `Dialogue: 0,${start},${end},Alcyone,,0,0,0,,${displayText}\n`;
    });
  });

  return assContent;
}

// 13. Thuban
export function generateThubanASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 56;

  const primaryFont = 'Impact';
  const yellowBanner = '&H0000FFFF&';
  const blackText = '&H00000000&';

  const alignment = ALIGNMENT_MAP[position] || 5;
  const baseMargin = position?.includes('middle') ? 0 : 60;
  const borderThickness = 18;

  let assContent = `[Script Info]
Title: Thuban Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Thuban,${primaryFont},${fontSizeNum},${blackText},${blackText},${yellowBanner},&H00000000&,-1,-1,0,0,100,100,2,0,3,${borderThickness},0,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);

  const wordPattern = [4, 4, 1, 1, 1, 1, 1, 1];
  const segments: { words: WordWithTiming[]; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  const rotationPattern = [8, -8, 0];
  const getRandomX = () => Math.floor(600 + Math.random() * 720);

  segments.forEach((segment, segmentIndex) => {
    const text = segment.words.map(w => w.word.toUpperCase()).join(' ');
    const startTime = segment.start;
    const endTime = segment.end;
    const duration = endTime - startTime;
    const segmentRotation = rotationPattern[segmentIndex % rotationPattern.length];
    const posX = getRandomX();
    const posY = 540;
    const bounceSpeed = 350;
    const numBounces = Math.max(3, Math.ceil((duration * 1000) / bounceSpeed));

    let bounceText = '';
    let currentTime = 0;
    const bounceDuration = Math.floor((duration * 1000) / numBounces);

    for (let i = 0; i < numBounces; i++) {
      const nextTime = currentTime + bounceDuration;
      if (i % 2 === 0) {
        bounceText += `{\\t(${currentTime},${nextTime},\\fscx110\\fscy110)}`;
      } else {
        bounceText += `{\\t(${currentTime},${nextTime},\\fscx100\\fscy100)}`;
      }
      currentTime = nextTime;
    }

    const start = formatTime(startTime);
    const end = formatTime(endTime);
    const paddedText = `  ${text}  `;
    assContent += `Dialogue: 0,${start},${end},Thuban,,0,0,0,,{\\pos(${posX},${posY})\\frz${segmentRotation}}${bounceText}${paddedText}\n`;
  });

  return assContent;
}

// 14. Closed Caption
export function generateClosedCaptionASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, wordsPerLine } = options;
  const fontSizeNum = fontSize || 42;

  const primaryFont = 'Courier New';
  const whiteText = '&H00FFFFFF&';
  const blackBox = '&H00000000&';

  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 60;
  const boxPadding = Math.round(fontSizeNum * 0.25);

  let assContent = `[Script Info]
Title: Closed Caption Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ClosedCaption,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${blackBox},${blackBox},0,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const effectiveWPL = wordsPerLine && wordsPerLine > 0 ? wordsPerLine : 5;
  const lines: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < allWords.length; i += effectiveWPL) {
    const lineWords = allWords.slice(i, Math.min(i + effectiveWPL, allWords.length));
    lines.push({ text: lineWords.map(w => w.word).join(' '), start: lineWords[0].start, end: lineWords[lineWords.length - 1].end });
  }

  lines.forEach((line, lineIndex) => {
    const start = formatTime(line.start);
    const end = formatTime(line.end);
    const prevText = lineIndex > 0 ? lines[lineIndex - 1].text : '';
    if (prevText) {
      assContent += `Dialogue: 0,${start},${end},ClosedCaption,,0,0,0,,${prevText}\\N${line.text}\n`;
    } else {
      assContent += `Dialogue: 0,${start},${end},ClosedCaption,,0,0,0,,${line.text}\n`;
    }
  });

  return assContent;
}

// 15. Marigold
export function generateMarigoldASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 48;
  const primaryFont = 'Courier New';
  const goldColor = '&H0000D7FF&';
  const whiteColor = '&H00FFFFFF&';
  const yellowGlow = '&H0000FFFF&';
  const darkShadow = '&H80000000&';
  const alignment = ALIGNMENT_MAP[position] || 2;
  const baseMargin = position?.includes('middle') ? 0 : 50;

  let assContent = `[Script Info]
Title: Marigold Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: MarigoldGold,${primaryFont},${fontSizeNum},${goldColor},${goldColor},${yellowGlow},${darkShadow},0,-1,0,0,100,100,1,0,1,3,2,${alignment},40,40,${baseMargin},1
Style: MarigoldWhite,${primaryFont},${Math.floor(fontSizeNum * 0.9)},${whiteColor},${whiteColor},&H00000000&,${darkShadow},0,-1,0,0,100,100,1,0,1,2,1,${alignment},40,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const segments = segmentWordsByPattern(allWords, [1, 4, 4, 4]);

  segments.forEach((segment, segmentIndex) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const prevSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;
    const prevText = prevSegment ? prevSegment.text : '';

    if (prevText) {
      assContent += `Dialogue: 0,${start},${end},MarigoldWhite,,0,0,0,,${prevText}\\N{\\c${goldColor}\\3c${yellowGlow}\\bord3}${segment.text}\n`;
    } else {
      assContent += `Dialogue: 0,${start},${end},MarigoldGold,,0,0,0,,${segment.text}\n`;
    }
  });

  return assContent;
}

// 16. Handwritten Pop
export function generateHandwrittenPopASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, wordsPerLine } = options;
  const fontSizeNum = fontSize || 52;
  const primaryFont = 'Brush Script MT';
  const creamColor = '&H00D0FDFF&';
  const darkShadow = '&H80000000&';
  const alignment = ALIGNMENT_MAP[position] || 4;
  const baseMargin = position?.includes('middle') ? 0 : 60;

  let assContent = `[Script Info]
Title: Handwritten Pop Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HandwrittenPop,${primaryFont},${fontSizeNum},${creamColor},${creamColor},&H00000000&,${darkShadow},0,0,0,0,100,100,0,0,1,0,2,${alignment},100,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordsPerPhrase = wordsPerLine && wordsPerLine > 0 ? wordsPerLine : 5;
  const phrases: WordWithTiming[][] = [];
  for (let i = 0; i < allWords.length; i += wordsPerPhrase) {
    phrases.push(allWords.slice(i, Math.min(i + wordsPerPhrase, allWords.length)));
  }

  phrases.forEach((phraseWords) => {
    phraseWords.forEach((currentWord, wordIndex) => {
      const start = formatTime(currentWord.start);
      const end = formatTime(phraseWords[phraseWords.length - 1].end);
      let displayText = '';
      for (let i = 0; i <= wordIndex; i++) {
        const word = phraseWords[i].word;
        if (i === wordIndex) {
          displayText += `{\\fad(50,0)}${word} `;
        } else {
          displayText += `${word} `;
        }
      }
      assContent += `Dialogue: 0,${start},${end},HandwrittenPop,,0,0,0,,${displayText.trim()}\n`;
    });
  });

  return assContent;
}

// 17. Mizar
export function generateMizarASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize } = options;
  const fontSizeNum = fontSize || 64;
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const purpleGlow = '&H00FF3399&';
  const purpleShadow = '&H80FF3399&';

  let assContent = `[Script Info]
Title: Mizar Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Mizar,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${purpleGlow},${purpleShadow},-1,0,0,0,100,100,0,0,1,5,3,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const segments = segmentWordsByPattern(allWords, [3, 1, 1, 4, 4]).map(s => ({ ...s, text: s.text.toUpperCase() }));

  const positionVariants = [
    { x: 500, y: 480 }, { x: 960, y: 420 }, { x: 1400, y: 540 }, { x: 700, y: 600 },
    { x: 1200, y: 460 }, { x: 960, y: 580 }, { x: 600, y: 520 }, { x: 1300, y: 500 },
  ];
  const rotationAngles = [-8, 5, -3, 7, 0, -6, 4, -5];

  segments.forEach((segment, index) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const pos = positionVariants[index % positionVariants.length];
    const rotation = rotationAngles[index % rotationAngles.length];
    const effectTags = `{\\pos(${pos.x},${pos.y})\\frz${rotation}\\fad(80,0)\\blur3}`;
    assContent += `Dialogue: 0,${start},${end},Mizar,,0,0,0,,${effectTags}${segment.text}\n`;
  });

  return assContent;
}

// 18. Poem
export function generatePoemASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 44;
  const primaryFont = 'Georgia';
  const darkGray = '&H00444444&';
  const alignment = ALIGNMENT_MAP[position] || 4;
  const baseMargin = position?.includes('middle') ? 0 : 80;

  let assContent = `[Script Info]
Title: Poem Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Poem,${primaryFont},${fontSizeNum},${darkGray},${darkGray},&H00000000&,&H00000000&,0,-1,0,0,100,100,1,0,1,0,0,${alignment},120,40,${baseMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const segments = segmentWordsByPattern(allWords, [1, 3, 3, 4, 2]);

  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    assContent += `Dialogue: 0,${start},${end},Poem,,0,0,0,,{\\fad(120,0)}${segment.text}\n`;
  });

  return assContent;
}

// 19. Cartwheel Black
export function generateCartwheelBlackASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 56;
  const largeFontSize = Math.round(fontSizeNum * 1.3);
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const purpleAccent = '&H00ED3A7C&';
  const blackBox = '&H00000000&';
  const alignment = ALIGNMENT_MAP[position] || 5;
  const boxPadding = Math.round(fontSizeNum * 0.3);
  const largeBoxPadding = Math.round(largeFontSize * 0.3);

  let assContent = `[Script Info]
Title: Cartwheel Black Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CartwheelNormal,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${blackBox},${blackBox},-1,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,0,1
Style: CartwheelLarge,${primaryFont},${largeFontSize},${purpleAccent},${purpleAccent},${blackBox},${blackBox},-1,0,0,0,100,100,0,0,4,${largeBoxPadding},0,${alignment},40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [4, 1, 1, 1, 1];
  const segments: { text: string; start: number; end: number; isSingleWord: boolean }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ text: segmentWords.map(w => w.word.toUpperCase()).join(' '), start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end, isSingleWord: wordsInSegment === 1 });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  let multiWordSegmentCount = 0;
  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    if (segment.isSingleWord) {
      assContent += `Dialogue: 0,${start},${end},CartwheelLarge,,0,0,0,,${segment.text}\n`;
    } else {
      const words = segment.text.split(' ');
      const highlightIndex = multiWordSegmentCount % words.length;
      multiWordSegmentCount++;
      let displayText = '';
      words.forEach((word, i) => {
        if (i === highlightIndex) { displayText += `{\\c${purpleAccent}}${word}{\\c${whiteText}} `; }
        else { displayText += `${word} `; }
      });
      assContent += `Dialogue: 0,${start},${end},CartwheelNormal,,0,0,0,,${displayText.trim()}\n`;
    }
  });

  return assContent;
}

// 20. Cartwheel Purple
export function generateCartwheelPurpleASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 56;
  const largeFontSize = Math.round(fontSizeNum * 1.3);
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const yellowAccent = '&H0000FFFF&';
  const purpleBox = '&H00951D4C&';
  const alignment = ALIGNMENT_MAP[position] || 5;
  const boxPadding = Math.round(fontSizeNum * 0.3);
  const largeBoxPadding = Math.round(largeFontSize * 0.3);

  let assContent = `[Script Info]
Title: Cartwheel Purple Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CartwheelPurpleNormal,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${purpleBox},${purpleBox},-1,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,0,1
Style: CartwheelPurpleLarge,${primaryFont},${largeFontSize},${yellowAccent},${yellowAccent},${purpleBox},${purpleBox},-1,0,0,0,100,100,0,0,4,${largeBoxPadding},0,${alignment},40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [4, 1, 1, 1, 1];
  const segments: { text: string; start: number; end: number; isSingleWord: boolean }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ text: segmentWords.map(w => w.word.toUpperCase()).join(' '), start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end, isSingleWord: wordsInSegment === 1 });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  let multiWordSegmentCount = 0;
  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    if (segment.isSingleWord) {
      assContent += `Dialogue: 0,${start},${end},CartwheelPurpleLarge,,0,0,0,,${segment.text}\n`;
    } else {
      const words = segment.text.split(' ');
      const highlightIndex = multiWordSegmentCount % words.length;
      multiWordSegmentCount++;
      let displayText = '';
      words.forEach((word, i) => {
        if (i === highlightIndex) { displayText += `{\\c${yellowAccent}}${word}{\\c${whiteText}} `; }
        else { displayText += `${word} `; }
      });
      assContent += `Dialogue: 0,${start},${end},CartwheelPurpleNormal,,0,0,0,,${displayText.trim()}\n`;
    }
  });

  return assContent;
}

// 21. Caster
export function generateCasterASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 56;
  const largeFontSize = Math.round(fontSizeNum * 1.3);
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const blueAccent = '&H00FF8C00&';
  const lightPurpleBox = '&H00FF3399&';
  const alignment = ALIGNMENT_MAP[position] || 5;
  const boxPadding = Math.round(fontSizeNum * 0.3);
  const largeBoxPadding = Math.round(largeFontSize * 0.3);

  let assContent = `[Script Info]
Title: Caster Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CasterNormal,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${lightPurpleBox},${lightPurpleBox},-1,0,0,0,100,100,0,0,4,${boxPadding},0,${alignment},40,40,0,1
Style: CasterLarge,${primaryFont},${largeFontSize},${blueAccent},${blueAccent},${lightPurpleBox},${lightPurpleBox},-1,0,0,0,100,100,0,0,4,${largeBoxPadding},0,${alignment},40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [4, 1, 1, 1, 1];
  const segments: { text: string; start: number; end: number; isSingleWord: boolean }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ text: segmentWords.map(w => w.word.toUpperCase()).join(' '), start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end, isSingleWord: wordsInSegment === 1 });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  let multiWordSegmentCount = 0;
  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    if (segment.isSingleWord) {
      assContent += `Dialogue: 0,${start},${end},CasterLarge,,0,0,0,,${segment.text}\n`;
    } else {
      const words = segment.text.split(' ');
      const highlightIndex = multiWordSegmentCount % words.length;
      multiWordSegmentCount++;
      let displayText = '';
      words.forEach((word, i) => {
        if (i === highlightIndex) { displayText += `{\\c${blueAccent}}${word}{\\c${whiteText}} `; }
        else { displayText += `${word} `; }
      });
      assContent += `Dialogue: 0,${start},${end},CasterNormal,,0,0,0,,${displayText.trim()}\n`;
    }
  });

  return assContent;
}

// 22. Pulse
export function generatePulseASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position } = options;
  const fontSizeNum = fontSize || 56;
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const blueText = '&H00FF8C00&';
  const blackOutline = '&H00000000&';
  const alignment = ALIGNMENT_MAP[position] || 5;

  let assContent = `[Script Info]
Title: Pulse Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pulse,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${blackOutline},&H00000000&,-1,0,0,0,100,100,0,0,1,3,0,${alignment},40,40,0,1
Style: PulseBlue,${primaryFont},${fontSizeNum},${blueText},${blueText},${blackOutline},&H00000000&,-1,0,0,0,100,100,0,0,1,3,0,${alignment},40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordsPerLineVal = 3;
  const wordsPerSegment = wordsPerLineVal * 2;
  const segments: { words: WordWithTiming[]; start: number; end: number }[] = [];

  for (let i = 0; i < allWords.length; i += wordsPerSegment) {
    const segmentWords = allWords.slice(i, Math.min(i + wordsPerSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
  }

  let segmentCount = 0;
  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const words = segment.words.map(w => w.word.toUpperCase());
    const line1Words = words.slice(0, wordsPerLineVal);
    const line2Words = words.slice(wordsPerLineVal);
    const pulseEffect = '{\\fad(120,0)\\fscx80\\fscy80\\t(0,60,\\fscx115\\fscy115)\\t(60,120,\\fscx100\\fscy100)}';

    let displayText = `{\\c${blueText}}${line1Words.join(' ')}{\\c${whiteText}}`;
    if (line2Words.length > 0) {
      const randomIndex = segmentCount % line2Words.length;
      const line2Text = line2Words.map((word, i) => {
        if (i === randomIndex) { return `{\\c${blueText}}${word}{\\c${whiteText}}`; }
        return word;
      }).join(' ');
      displayText += `\\N${line2Text}`;
    }

    assContent += `Dialogue: 0,${start},${end},Pulse,,0,0,0,,${pulseEffect}${displayText}\n`;
    segmentCount++;
  });

  return assContent;
}

// 23. Fuel
export function generateFuelASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 56;
  const largeFontSize = Math.round(fontSizeNum * 1.6);
  const primaryFont = 'Impact';
  const whiteText = '&H00FFFFFF&';
  const limeGreen = '&H0000FFC8&';
  const blackOutline = '&H00000000&';
  const alignment = ALIGNMENT_MAP[position] || 5;

  let assContent = `[Script Info]
Title: Fuel Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fuel,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${blackOutline},&H00000000&,-1,0,0,0,100,100,0,0,1,3,0,${alignment},40,40,0,1
Style: FuelLime,${primaryFont},${largeFontSize},${limeGreen},${limeGreen},${blackOutline},&H00000000&,-1,0,0,0,100,100,0,0,1,3,0,${alignment},40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [2, 1, 1, 4, 4, 4];
  const segments: { text: string; start: number; end: number; wordCount: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ text: segmentWords.map(w => w.word.toUpperCase()).join(' '), start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end, wordCount: segmentWords.length });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  let segmentCount = 0;
  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const fuelEffect = '{\\fad(120,0)}';

    if (segment.wordCount <= 2) {
      assContent += `Dialogue: 0,${start},${end},FuelLime,,0,0,0,,${fuelEffect}${segment.text}\n`;
    } else {
      const words = segment.text.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      const line1Words = words.slice(0, midPoint);
      const line2Words = words.slice(midPoint);
      let displayText = '';

      if (line1Words.length > 0) {
        const limeIndex = segmentCount % line1Words.length;
        const line1Text = line1Words.map((word, i) => {
          if (i === limeIndex) { return `{\\c${limeGreen}\\fscx160\\fscy160}${word}{\\fscx100\\fscy100\\c${whiteText}}`; }
          return word;
        }).join(' ');
        displayText += line1Text;
      }

      if (line2Words.length > 0) {
        const limeIndex = (segmentCount + 1) % line2Words.length;
        const line2Text = line2Words.map((word, i) => {
          if (i === limeIndex) { return `{\\c${limeGreen}\\fscx160\\fscy160}${word}{\\fscx100\\fscy100\\c${whiteText}}`; }
          return word;
        }).join(' ');
        displayText += `\\N${line2Text}`;
      }

      assContent += `Dialogue: 0,${start},${end},Fuel,,0,0,0,,${fuelEffect}${displayText}\n`;
    }
    segmentCount++;
  });

  return assContent;
}

// 24. Scene
export function generateSceneASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 56;
  const largeFontSize = Math.round(fontSizeNum * 1.5);
  const primaryFont = 'Georgia';
  const goldenYellow = '&H0020C0F0&';
  const blackOutline = '&H00000000&';
  const alignment = ALIGNMENT_MAP[position] || 5;

  let assContent = `[Script Info]
Title: Scene Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Scene,${primaryFont},${fontSizeNum},${goldenYellow},${goldenYellow},${blackOutline},&H00000000&,0,0,0,0,100,100,0,0,1,2,0,${alignment},40,40,40,1
Style: SceneLarge,${primaryFont},${largeFontSize},${goldenYellow},${goldenYellow},${blackOutline},&H00000000&,0,0,0,0,100,100,0,0,1,2,0,${alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [2, 1];
  const segments: { words: WordWithTiming[]; start: number; end: number; wordCount: number; displayAs2Lines: boolean }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end, wordCount: segmentWords.length, displayAs2Lines: wordsInSegment === 2 });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    const sceneEffect = '{\\fad(120,0)}';
    if (segment.displayAs2Lines && segment.words.length === 2) {
      assContent += `Dialogue: 0,${start},${end},Scene,,0,0,0,,${sceneEffect}${segment.words[0].word}\\N${segment.words[1].word}\n`;
    } else {
      const text = segment.words.map(w => w.word).join(' ');
      assContent += `Dialogue: 0,${start},${end},SceneLarge,,0,0,0,,${sceneEffect}${text}\n`;
    }
  });

  return assContent;
}

// 25. Neon Glow
export function generateNeonGlowASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 56;
  const primaryFont = 'Arial Rounded MT Bold';
  const lightPink = '&H00CBC0FF&';
  const darkPink = '&H009314FF&';
  const deepPink = '&H009314FF&';
  const alignment = ALIGNMENT_MAP[position] || 5;

  let assContent = `[Script Info]
Title: Neon Glow Pop-In Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: NeonGlow,${primaryFont},${fontSizeNum},${lightPink},${lightPink},${deepPink},&H00000000&,-1,0,0,0,100,100,0,0,1,4,0,${alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [1, 4, 2, 3];
  const segments: { words: WordWithTiming[]; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  const neonEffect = '{\\blur2}';

  for (let i = 0; i < segments.length; i += 2) {
    const line1Segment = segments[i];
    const line2Segment = segments[i + 1];
    const allLineWords = [...line1Segment.words];
    if (line2Segment) { allLineWords.push(...line2Segment.words); }

    allLineWords.forEach((currentWord, wordIdx) => {
      const start = formatTime(currentWord.start);
      const endTime = wordIdx < allLineWords.length - 1 ? allLineWords[wordIdx + 1].start : currentWord.end;
      const end = formatTime(endTime);

      const line1Text = line1Segment.words.map(w => {
        if (w.start === currentWord.start && w.end === currentWord.end) { return `{\\c${darkPink}}${w.word}{\\c${lightPink}}`; }
        return w.word;
      }).join(' ');

      let displayText = line1Text;
      if (line2Segment) {
        const line2Text = line2Segment.words.map(w => {
          if (w.start === currentWord.start && w.end === currentWord.end) { return `{\\c${darkPink}}${w.word}{\\c${lightPink}}`; }
          return w.word;
        }).join(' ');
        displayText += `\\N${line2Text}`;
      }

      assContent += `Dialogue: 0,${start},${end},NeonGlow,,0,0,0,,${neonEffect}${displayText}\n`;
    });
  }

  return assContent;
}

// 26. Drive
export function generateDriveASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 56;
  const primaryFont = 'Arial';
  const whiteText = '&H00FFFFFF&';
  const blackOutline = '&H00000000&';
  const alignment = ALIGNMENT_MAP[position] || 5;
  const letterSpacing = 8;

  let assContent = `[Script Info]
Title: Drive Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Drive,${primaryFont},${fontSizeNum},${whiteText},${whiteText},${blackOutline},&H00000000&,-1,0,0,0,100,100,${letterSpacing},0,1,4,0,${alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const segments = segmentWordsByPattern(allWords, [4, 3, 2, 1, 1]).map(s => ({ ...s, text: s.text.toUpperCase() }));

  segments.forEach((segment) => {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    assContent += `Dialogue: 0,${start},${end},Drive,,0,0,0,,{\\fad(300,0)}${segment.text}\n`;
  });

  return assContent;
}

// 27. Freshly
export function generateFreshlyASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 48;
  const primaryFont = 'Inter Light';
  const highlightedText = '&H00FFFCF5&';
  const dimText = '&H00736F66&';
  const pillBgColor = '&H00282828&';
  const centerX = Math.round(videoWidth / 2);
  const centerY = Math.round(videoHeight / 2);

  const getYPosition = (): number => {
    if (position && position.includes('top')) return Math.round(videoHeight * 0.14);
    if (position && position.includes('bottom')) return Math.round(videoHeight * 0.86);
    return centerY;
  };
  const yPos = getYPosition();

  let assContent = `[Script Info]
Title: Freshly Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: FreshlyText,${primaryFont},${fontSizeNum},${dimText},${dimText},&H00000000&,&H00000000&,0,0,0,0,100,100,0,0,1,0,0,5,40,40,40,1
Style: FreshlyPill,Arial,${fontSizeNum},${pillBgColor},${pillBgColor},${pillBgColor},${pillBgColor},0,0,0,0,100,100,0,0,1,0,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const createPillShape = (w: number, h: number): string => {
    const r = Math.round(h / 2);
    const k = 0.55;
    const kr = Math.round(r * k);
    return `m ${r} 0 ` + `l ${w - r} 0 ` + `b ${w - r + kr} 0 ${w} ${r - kr} ${w} ${r} ` + `l ${w} ${h - r} ` + `b ${w} ${h - r + kr} ${w - r + kr} ${h} ${w - r} ${h} ` + `l ${r} ${h} ` + `b ${r - kr} ${h} 0 ${h - r + kr} 0 ${h - r} ` + `l 0 ${r} ` + `b 0 ${r - kr} ${r - kr} 0 ${r} 0`;
  };

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [4, 3, 2, 1, 1];
  const segments: WordWithTiming[][] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) { segments.push(segmentWords); }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  segments.forEach((segmentWords) => {
    const fullText = segmentWords.map(w => w.word).join(' ');
    const textWidth = fullText.length * fontSizeNum * 0.5;
    const pillWidth = textWidth + 60;
    const pillHeight = fontSizeNum + 30;

    segmentWords.forEach((currentWord, wordIdx) => {
      const start = formatTime(currentWord.start);
      const endTime = wordIdx < segmentWords.length - 1 ? segmentWords[wordIdx + 1].start : currentWord.end;
      const end = formatTime(endTime);

      const pw = Math.round(pillWidth);
      const ph = Math.round(pillHeight);
      const pillShape = createPillShape(pw, ph);
      const pillLeftX = Math.round(centerX - pw / 2);
      const pillTopY = Math.round(yPos - ph / 2);
      assContent += `Dialogue: 0,${start},${end},FreshlyPill,,0,0,0,,{\\an7\\pos(${pillLeftX},${pillTopY})\\c&H282828&\\1c&H282828&\\bord0\\shad0\\p1}${pillShape}{\\p0}\n`;

      const displayText = segmentWords.map((w, i) => {
        if (i <= wordIdx) { return `{\\c${highlightedText}}${w.word}{\\c${dimText}}`; }
        return w.word;
      }).join(' ');
      assContent += `Dialogue: 1,${start},${end},FreshlyText,,0,0,0,,{\\an5\\pos(${centerX},${yPos})}${displayText}\n`;
    });
  });

  return assContent;
}

// 28. Slate
export function generateSlateASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 48;
  const primaryFont = 'Inter Light';
  const filledText = '&H00404040&';
  const unfilledText = '&H00C0C0C0&';
  const whiteBg = '&H00FFFFFF&';
  const centerX = Math.round(videoWidth / 2);
  const centerY = Math.round(videoHeight / 2);

  const getYPosition = (): number => {
    if (position && position.includes('top')) return Math.round(videoHeight * 0.14);
    if (position && position.includes('bottom')) return Math.round(videoHeight * 0.86);
    return centerY;
  };
  const yPos = getYPosition();

  let assContent = `[Script Info]
Title: Slate Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SlateText,${primaryFont},${fontSizeNum},${unfilledText},${unfilledText},&H00000000&,&H00000000&,0,0,0,0,100,100,0,0,1,0,0,5,40,40,40,1
Style: SlateBg,Arial,${fontSizeNum},${whiteBg},${whiteBg},${whiteBg},${whiteBg},0,0,0,0,100,100,0,0,1,0,0,5,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const createRectShape = (w: number, h: number): string => {
    return `m 0 0 l ${w} 0 l ${w} ${h} l 0 ${h} l 0 0`;
  };

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [4, 3, 2, 1, 1];
  const segments: WordWithTiming[][] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) { segments.push(segmentWords); }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  segments.forEach((segmentWords) => {
    const fullText = segmentWords.map(w => w.word).join(' ');
    const textWidth = fullText.length * fontSizeNum * 0.5;
    const bgWidth = textWidth + 60;
    const bgHeight = fontSizeNum + 30;

    segmentWords.forEach((currentWord, wordIdx) => {
      const start = formatTime(currentWord.start);
      const endTime = wordIdx < segmentWords.length - 1 ? segmentWords[wordIdx + 1].start : currentWord.end;
      const end = formatTime(endTime);

      const bw = Math.round(bgWidth);
      const bh = Math.round(bgHeight);
      const rectShape = createRectShape(bw, bh);
      const bgLeftX = Math.round(centerX - bw / 2);
      const bgTopY = Math.round(yPos - bh / 2);
      assContent += `Dialogue: 0,${start},${end},SlateBg,,0,0,0,,{\\an7\\pos(${bgLeftX},${bgTopY})\\c${whiteBg}\\1c${whiteBg}\\bord0\\shad0\\p1}${rectShape}{\\p0}\n`;

      const displayText = segmentWords.map((w, i) => {
        if (i <= wordIdx) { return `{\\c${filledText}}${w.word}{\\c${unfilledText}}`; }
        return w.word;
      }).join(' ');
      assContent += `Dialogue: 1,${start},${end},SlateText,,0,0,0,,{\\an5\\pos(${centerX},${yPos})}${displayText}\n`;
    });
  });

  return assContent;
}

// 29. Minima
export function generateMinimaASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 52;
  const primaryFont = 'Arial';
  const whiteText = '&H00FDFDFD&';
  const alignment = ALIGNMENT_MAP[position] || 5;

  let assContent = `[Script Info]
Title: Minima Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Minima,${primaryFont},${fontSizeNum},${whiteText},${whiteText},&H00000000&,&H00000000&,-1,0,0,0,100,100,0,0,1,0,0,${alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [3, 4, 3, 4];
  const segments: { text: string; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ text: segmentWords.map(w => w.word.toLowerCase()).join(' '), start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  segments.forEach((segment, idx) => {
    const gapBefore = 0.05;
    const gapAfter = 0.05;
    const adjustedStart = idx === 0 ? segment.start : segment.start + gapBefore;
    const adjustedEnd = segment.end - gapAfter;
    const start = formatTime(adjustedStart);
    const end = formatTime(adjustedEnd);
    assContent += `Dialogue: 0,${start},${end},Minima,,0,0,0,,{\\fad(200,200)}${segment.text}\n`;
  });

  return assContent;
}

// 30. Blueprint
export function generateBlueprintASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 52;
  const primaryFont = 'Inter';
  const whiteText = '&H00FDFDFD&';
  const dimText = '&H00808080&';
  const lineColor = '&H00FDFDFD&';
  const centerX = Math.round(videoWidth / 2);

  const getYPosition = (): number => {
    if (position && position.includes('top')) return Math.round(videoHeight * 0.14);
    if (position && position.includes('bottom')) return Math.round(videoHeight * 0.83);
    return Math.round(videoHeight * 0.48);
  };
  const yPos = getYPosition();
  const lineSpacing = fontSizeNum + 20;

  let assContent = `[Script Info]
Title: Blueprint Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: BlueprintText,${primaryFont},${fontSizeNum},${whiteText},${whiteText},&H00000000&,&H00000000&,-1,0,0,0,100,100,2,0,1,0,0,5,40,40,40,1
Style: BlueprintLine,${primaryFont},20,${lineColor},${lineColor},${lineColor},${lineColor},0,0,0,0,100,100,0,0,1,0,0,7,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const createLine = (w: number, lineThickness = 3): string => {
    const lt = lineThickness;
    return `m 0 0 l ${w} 0 l ${w} ${lt} l 0 ${lt} l 0 0`;
  };

  const allWords = extractAllWords(subtitleData);
  const wordsPerSegment = 4;
  const segments: WordWithTiming[][] = [];
  for (let i = 0; i < allWords.length; i += wordsPerSegment) {
    const segmentWords = allWords.slice(i, Math.min(i + wordsPerSegment, allWords.length));
    if (segmentWords.length > 0) { segments.push(segmentWords); }
  }

  segments.forEach((segmentWords) => {
    const midPoint = Math.ceil(segmentWords.length / 2);
    const line1Words = segmentWords.slice(0, midPoint);
    const line2Words = segmentWords.slice(midPoint);
    const line1Y = yPos;
    const line2Y = yPos + lineSpacing;

    const getWordPositions = (words: WordWithTiming[], lineY: number) => {
      const lineText = words.map(w => w.word.toUpperCase()).join('  ');
      const totalWidth = lineText.length * fontSizeNum * 0.52;
      let currentX = centerX - totalWidth / 2;
      return words.map(w => {
        const wordText = w.word.toUpperCase();
        const wordWidth = wordText.length * fontSizeNum * 0.52;
        const pos = { x: currentX, width: wordWidth, y: lineY };
        currentX += wordWidth + fontSizeNum * 0.52 * 2;
        return { ...w, ...pos };
      });
    };

    const line1Positions = getWordPositions(line1Words, line1Y);
    const line2Positions = getWordPositions(line2Words, line2Y);
    const allPositions = [...line1Positions, ...line2Positions];
    const segmentEnd = formatTime(allPositions[allPositions.length - 1].end);

    allPositions.forEach((currentWord, wordIdx) => {
      const start = formatTime(currentWord.start);
      const end = wordIdx < allPositions.length - 1 ? formatTime(allPositions[wordIdx + 1].start) : segmentEnd;

      const line1Text = line1Positions.map(w => {
        const isSpoken = allPositions.findIndex(p => p.start === w.start) <= wordIdx;
        if (isSpoken) { return `{\\c${whiteText}}${w.word.toUpperCase()}{\\c${dimText}}`; }
        return `{\\c${dimText}}${w.word.toUpperCase()}`;
      }).join('  ');

      const line2Text = line2Positions.map(w => {
        const isSpoken = allPositions.findIndex(p => p.start === w.start) <= wordIdx;
        if (isSpoken) { return `{\\c${whiteText}}${w.word.toUpperCase()}{\\c${dimText}}`; }
        return `{\\c${dimText}}${w.word.toUpperCase()}`;
      }).join('  ');

      assContent += `Dialogue: 0,${start},${end},BlueprintText,,0,0,0,,{\\an5\\pos(${centerX},${line1Y})}${line1Text}\n`;
      if (line2Positions.length > 0) {
        assContent += `Dialogue: 0,${start},${end},BlueprintText,,0,0,0,,{\\an5\\pos(${centerX},${line2Y})}${line2Text}\n`;
      }

      const lineWidth = currentWord.width + 10;
      const lineX = currentWord.x - 5;
      const underlineY = currentWord.y + fontSizeNum / 2 + 8;
      const plainLine = createLine(Math.round(lineWidth), 3);
      assContent += `Dialogue: 1,${start},${segmentEnd},BlueprintLine,,0,0,0,,{\\an7\\pos(${Math.round(lineX)},${Math.round(underlineY)})\\c${lineColor}\\p1}${plainLine}{\\p0}\n`;
    });
  });

  return assContent;
}

// 31. Orbitar Black
export function generateOrbitarBlackASSContent(subtitleData: SubtitleSegment[], options: ASSGeneratorOptions): string {
  const { fontSize, position, videoWidth = 1920, videoHeight = 1080 } = options;
  const fontSizeNum = fontSize || 48;
  const primaryFont = 'Arial';
  const goldenYellow = '&H0000C3FD&';
  const whiteText = '&H00FDFDFD&';
  const blackBox = '&H00000000&';
  const centerX = Math.round(videoWidth / 2);

  const getYPosition = (): number => {
    if (position && position.includes('top')) return Math.round(videoHeight * 0.19);
    if (position && position.includes('bottom')) return Math.round(videoHeight * 0.79);
    return Math.round(videoHeight * 0.44);
  };
  const yPos = getYPosition();
  const pillHeight = fontSizeNum + 20;
  const lineSpacing = pillHeight - 8;

  let assContent = `[Script Info]
Title: Orbitar Black Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: OrbitarText,${primaryFont},${fontSizeNum},${whiteText},${whiteText},&H00000000&,&H00000000&,-1,-1,0,0,100,100,0,0,1,0,0,5,40,40,40,1
Style: OrbitarPill,${primaryFont},${fontSizeNum},${blackBox},${blackBox},${blackBox},${blackBox},0,0,0,0,100,100,0,0,1,0,0,7,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const createPillShape = (w: number, h: number): string => {
    const r = Math.round(h / 2);
    const k = 0.55;
    const kr = Math.round(r * k);
    return `m ${r} 0 ` + `l ${w - r} 0 ` + `b ${w - r + kr} 0 ${w} ${r - kr} ${w} ${r} ` + `b ${w} ${r + kr} ${w - r + kr} ${h} ${w - r} ${h} ` + `l ${r} ${h} ` + `b ${r - kr} ${h} 0 ${r + kr} 0 ${r} ` + `b 0 ${r - kr} ${r - kr} 0 ${r} 0`;
  };

  const allWords = extractAllWords(subtitleData);
  const wordPattern = [1, 3, 2];
  const segments: { words: WordWithTiming[]; start: number; end: number }[] = [];
  let wordIndex = 0;
  let patternIndex = 0;

  while (wordIndex < allWords.length) {
    const wordsInSegment = wordPattern[patternIndex % wordPattern.length];
    const segmentWords = allWords.slice(wordIndex, Math.min(wordIndex + wordsInSegment, allWords.length));
    if (segmentWords.length > 0) {
      segments.push({ words: segmentWords, start: segmentWords[0].start, end: segmentWords[segmentWords.length - 1].end });
    }
    wordIndex += wordsInSegment;
    patternIndex++;
  }

  for (let i = 0; i < segments.length; i += 3) {
    const displaySegments = segments.slice(i, Math.min(i + 3, segments.length));
    if (displaySegments.length === 0) continue;

    const groupTilt = (Math.floor(i / 3) % 2 === 0) ? -3 : 3;

    const lineData = displaySegments.map((seg, lineIdx) => {
      const lineY = yPos + (lineIdx * lineSpacing);
      const text = seg.words.map(w => w.word).join(' ');
      const textWidth = text.length * fontSizeNum * 0.55;
      const linePillWidth = textWidth + 50;
      const linePillHeight = pillHeight;
      const pillX = centerX - linePillWidth / 2;
      const pillTopY = lineY - linePillHeight / 2;
      return { ...seg, lineY, text, textWidth, pillWidth: linePillWidth, pillHeight: linePillHeight, pillX, pillY: pillTopY, tilt: groupTilt };
    });

    const allDisplayWords: (WordWithTiming & { lineIdx: number; lineData: typeof lineData[0] })[] = [];
    lineData.forEach((line, lineIdx) => {
      line.words.forEach(word => { allDisplayWords.push({ ...word, lineIdx, lineData: line }); });
    });

    const displayEnd = formatTime(allDisplayWords[allDisplayWords.length - 1].end);

    allDisplayWords.forEach((currentWord, wordIdx) => {
      const start = formatTime(currentWord.start);
      const end = wordIdx < allDisplayWords.length - 1 ? formatTime(allDisplayWords[wordIdx + 1].start) : displayEnd;

      lineData.forEach((line) => {
        const pillShape = createPillShape(Math.round(line.pillWidth), Math.round(line.pillHeight));
        const slowBounce = `\\t(0,800,\\fscx103\\fscy103)\\t(800,1600,\\fscx100\\fscy100)\\t(1600,2400,\\fscx103\\fscy103)\\t(2400,3200,\\fscx100\\fscy100)`;

        assContent += `Dialogue: 0,${start},${end},OrbitarPill,,0,0,0,,{\\an7\\pos(${Math.round(line.pillX)},${Math.round(line.pillY)})\\frz${line.tilt}\\shad3\\4c&H00000000&\\4a&H80&${slowBounce}\\p1}${pillShape}{\\p0}\n`;

        const lineText = line.words.map(w => {
          const wordGlobalIdx = allDisplayWords.findIndex(dw => dw.start === w.start && dw.word === w.word);
          const isSpoken = wordGlobalIdx <= wordIdx;
          if (isSpoken) { return `{\\c${goldenYellow}}${w.word}{\\c${whiteText}}`; }
          return w.word;
        }).join(' ');

        assContent += `Dialogue: 1,${start},${end},OrbitarText,,0,0,0,,{\\an5\\pos(${centerX},${Math.round(line.lineY)})\\frz${line.tilt}\\b1\\i1${slowBounce}}${lineText}\n`;
      });
    });
  }

  return assContent;
}
