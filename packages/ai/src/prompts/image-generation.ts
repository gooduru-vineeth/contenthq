export function getImageGenerationPrompt(visualDescription: string, style = "cinematic"): string {
  return `${visualDescription}. Style: ${style}, photorealistic, high quality, 4K resolution, professional photography, dramatic lighting. No text, no watermarks, no logos.`;
}

export function refineImagePrompt(visualDescription: string): string {
  return `Convert this scene description into an optimized AI image generation prompt:

"${visualDescription}"

Requirements:
- Be specific and descriptive
- Include art style (photorealistic, cinematic)
- Specify lighting and mood
- Include composition (close-up, wide shot, aerial)
- Keep under 300 characters
- No text or watermarks in the image
- Focus on one clear subject

Return only the refined prompt, nothing else.`;
}
