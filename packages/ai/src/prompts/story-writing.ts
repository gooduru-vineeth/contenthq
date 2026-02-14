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
- For each scene, choose a camera motion (zoom_in, zoom_out, pan_left, pan_right, pan_up, pan_down, kenburns_in, kenburns_out, static) with speed 0.1-1.0
- For each scene, choose a transition to the next scene (fade, fadeblack, fadewhite, dissolve, wipeleft, wiperight, slideleft, slideright, circleopen, circleclose, radial, smoothleft, smoothright, zoomin, none). Use "none" for the last scene.
- For each scene, create an optimized AI image generation prompt (imagePrompt). Include art style, lighting, mood, and composition. Keep under 300 characters. No text or watermarks.

Create a structured story with:
1. A compelling title
2. An attention-grabbing hook (first line the viewer hears)
3. A brief synopsis
4. A narrative arc (setup, rising action, climax, resolution)
5. Individual scenes with: visual description, narration script, image prompt, suggested duration, camera motion, and transition`;
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
        imagePrompt: "Cinematic wide shot, dramatic lighting, photorealistic, 4K",
        duration: 8,
        motionSpec: { type: "kenburns_in", speed: 0.5 },
        transition: "fade",
      },
    ],
  };
}
