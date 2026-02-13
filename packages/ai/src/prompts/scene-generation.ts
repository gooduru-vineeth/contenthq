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
4. Motion Spec: Camera movement type and speed for this scene
5. Transition: How this scene transitions to the next
6. Duration: Suggested duration in seconds (5-12)

MOTION TYPES (choose the most emotionally appropriate):
- zoom_in: Draws viewer attention inward, builds focus and intensity. Great for revelations, important details, emotional moments.
- zoom_out: Reveals context, creates sense of scale or distance. Use for establishing shots, conclusions, reflective moments.
- pan_left: Suggests looking back, reviewing, or temporal regression. Good for flashbacks, comparisons.
- pan_right: Implies forward movement, progress, continuation. Natural for narrative flow, sequences.
- pan_up: Conveys aspiration, hope, grandeur. Use for inspirational moments, tall subjects.
- pan_down: Grounds the viewer, reveals details below. Good for introspection, grounding moments.
- kenburns_in: Classic documentary feel with gentle zoom + slight drift. Ideal for storytelling, interviews, emotional depth.
- kenburns_out: Reverse Ken Burns, pulling away gently. Great for endings, reflections, winding down.
- static: No movement. Use sparingly for text-heavy scenes, impactful stills, or dramatic pauses.

MOTION SPEED (0.1 to 1.0):
- 0.2-0.3: Gentle, contemplative, peaceful scenes
- 0.4-0.5: Moderate, balanced storytelling (default)
- 0.6-0.7: Dynamic, energetic, engaging
- 0.8-1.0: Dramatic, intense, action-oriented

TRANSITION TYPES (choose based on narrative flow):
- fade: Smooth opacity transition. Default, works everywhere.
- fadeblack: Fade through black. Suggests time passing, scene change, dramatic pause.
- fadewhite: Fade through white. Dream sequences, flashbacks, ethereal moments.
- dissolve: Gradual cross-dissolve. Smooth narrative continuity, related scenes.
- wipeleft / wiperight: Directional wipe. Energetic, suggests spatial movement or comparison.
- slideleft / slideright: Slide transition. Modern, dynamic, good for lists or sequences.
- circleopen / circleclose: Circular reveal/close. Cinematic, dramatic focus.
- smoothleft / smoothright: Smooth directional blend. Professional, polished feel.
- zoomin: Zoom into next scene. Dramatic, intense transitions.
- none: Hard cut. Use for abrupt changes, shock, or fast-paced editing.

Make each scene visually distinct and compelling. Ensure narration timing matches the suggested duration.
Vary the motion types and transitions across scenes for visual interest — avoid using the same motion or transition for consecutive scenes.`;
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
