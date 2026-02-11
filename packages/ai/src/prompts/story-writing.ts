export function getStoryWritingPrompt(content: string, tone: string, targetDuration: number): string {
  const sceneCount = Math.max(3, Math.ceil(targetDuration / 8));

  return `You are a professional story writer creating narrated video content.

Based on the following source content, create a compelling video story.

SOURCE CONTENT:
${content}

REQUIREMENTS:
- Tone: ${tone}
- Target duration: ${targetDuration} seconds
- Number of scenes: ${sceneCount}
- Create a strong hook in the first 3 seconds
- Each scene should be 5-10 seconds long
- Include clear visual descriptions for each scene
- Write narration scripts that are engaging and concise
- Ensure smooth transitions between scenes

Create a structured story with:
1. A compelling title
2. An attention-grabbing hook (first line the viewer hears)
3. A brief synopsis
4. A narrative arc (setup, rising action, climax, resolution)
5. Individual scenes with: visual description, narration script, and suggested duration`;
}

export function getStoryOutputSchema() {
  return {
    title: "Story title",
    hook: "Opening hook line",
    synopsis: "Brief story synopsis",
    narrativeArc: {
      setup: "string",
      risingAction: "string",
      climax: "string",
      resolution: "string",
    },
    scenes: [
      {
        index: 0,
        visualDescription: "What the viewer sees",
        narrationScript: "What the narrator says",
        duration: 8,
      },
    ],
  };
}
