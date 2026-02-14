export function getScriptGenerationPrompt(
  content: string,
  tone: string,
  targetDuration: number,
  language: string = "en"
): string {
  const wordCount = Math.ceil(targetDuration * 2.5); // ~150 words per minute = 2.5 words/sec

  return `You are a professional script writer creating narrated video content.

Based on the following source content, create a compelling continuous narration script.

SOURCE CONTENT:
${content}

REQUIREMENTS:
- Tone: ${tone}
- Target duration: ${targetDuration} seconds
- Target word count: approximately ${wordCount} words
- Language: ${language}
- Create a strong opening hook in the first sentence
- Write continuous, flowing narration (do NOT split into scenes)
- The script should be engaging, concise, and well-paced
- Include natural pauses and transitions in the text
- Use short sentences for punchier delivery
- Vary sentence length for rhythm

OUTPUT STRUCTURE:
1. A compelling title
2. An attention-grabbing hook (first line the viewer hears)
3. A brief synopsis (1-2 sentences)
4. A narrative arc breakdown (setup, rising action, climax, resolution)
5. The full continuous narration script

The full script should be a single continuous text, not divided into scenes. Scene boundaries will be determined later based on audio timing.`;
}

export function getScriptOutputSchema() {
  return {
    title: "Script title",
    hook: "Opening hook line",
    synopsis: "Brief script synopsis",
    narrativeArc: {
      setup: "string",
      risingAction: "string",
      climax: "string",
      resolution: "string",
    },
    fullScript: "The complete continuous narration script text...",
    wordCount: 150,
    estimatedDurationSec: 60,
  };
}
