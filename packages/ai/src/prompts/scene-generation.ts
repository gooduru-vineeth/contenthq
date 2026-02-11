export function getSceneBreakdownPrompt(story: { title: string; synopsis: string; hook: string }): string {
  return `You are a video scene director. Break down the following story into detailed scenes for video production.

STORY:
Title: ${story.title}
Hook: ${story.hook}
Synopsis: ${story.synopsis}

For each scene, provide:
1. Visual Description: Detailed description of what appears on screen
2. Image Prompt: A prompt suitable for AI image generation (DALL-E style)
3. Narration Script: Exact words the narrator speaks
4. Motion Spec: Camera movement (ken_burns, zoom_in, zoom_out, pan_left, pan_right, static)
5. Transition: How this scene transitions to the next (crossfade, cut, wipe)
6. Duration: Suggested duration in seconds (5-12)

Make each scene visually distinct and compelling. Ensure narration timing matches the suggested duration.`;
}

export function getImagePromptRefinementPrompt(visualDescription: string): string {
  return `Convert the following scene description into an optimized image generation prompt.

SCENE DESCRIPTION:
${visualDescription}

REQUIREMENTS:
- Create a single, specific image prompt
- Include art style (photorealistic, cinematic, illustration, etc.)
- Specify lighting and mood
- Include composition details (close-up, wide shot, etc.)
- Keep under 300 characters
- Do not include text or watermarks in the image
- Focus on one clear subject/moment`;
}
