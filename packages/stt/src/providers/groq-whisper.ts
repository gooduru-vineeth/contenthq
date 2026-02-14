import Groq from "groq-sdk";
import type { STTResult, WordTimestamp, STTSegment, STTOptions } from "../types";

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export async function transcribeWithGroqWhisper(
  audioBuffer: Buffer,
  options: STTOptions = {}
): Promise<STTResult> {
  const file = new File([new Uint8Array(audioBuffer)], "audio.mp3", { type: "audio/mpeg" });

  const response = await getGroqClient().audio.transcriptions.create({
    file,
    model: options.model || "whisper-large-v3-turbo",
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
    language: options.language || "en",
  });

  const rawWords = (response as any).words ?? [];
  const rawSegments = (response as any).segments ?? [];

  const words: WordTimestamp[] = rawWords.map((w: any) => ({
    word: w.word?.trim() ?? "",
    startMs: Math.round((w.start ?? 0) * 1000),
    endMs: Math.round((w.end ?? 0) * 1000),
    confidence: w.confidence ?? 1.0,
  }));

  const segments: STTSegment[] = rawSegments.map((seg: any) => ({
    text: seg.text?.trim() ?? "",
    startMs: Math.round((seg.start ?? 0) * 1000),
    endMs: Math.round((seg.end ?? 0) * 1000),
    words: (seg.words ?? []).map((w: any) => ({
      word: w.word?.trim() ?? "",
      startMs: Math.round((w.start ?? 0) * 1000),
      endMs: Math.round((w.end ?? 0) * 1000),
      confidence: w.confidence ?? 1.0,
    })),
  }));

  const totalDurationMs = words.length > 0 ? words[words.length - 1].endMs : 0;
  const avgConfidence =
    words.length > 0
      ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length
      : 1.0;

  return {
    words,
    segments,
    totalDurationMs,
    wordCount: words.length,
    confidence: avgConfidence,
    rawResponse: response,
  };
}
