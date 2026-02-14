export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface STTSegment {
  text: string;
  startMs: number;
  endMs: number;
  words: WordTimestamp[];
}

export interface STTResult {
  words: WordTimestamp[];
  segments: STTSegment[];
  totalDurationMs: number;
  wordCount: number;
  confidence: number;
  rawResponse?: unknown;
}

export interface STTOptions {
  audioUrl?: string;
  audioBuffer?: Buffer;
  language?: string;
  provider?: string;
  model?: string;
}
