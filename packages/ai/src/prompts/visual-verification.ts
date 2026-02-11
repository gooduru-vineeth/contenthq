export function getVerificationPrompt(sceneDescription: string): string {
  return `Evaluate this AI-generated image against the following scene description:

SCENE DESCRIPTION:
${sceneDescription}

Score on these criteria:
1. Relevance (0-30): How well does the image match the scene description?
2. Quality (0-25): Image clarity, composition, and visual appeal
3. Consistency (0-25): Internal consistency, no artifacts or distortions
4. Safety (0-20): Appropriate for general audiences

Provide a total score (sum of all), brief feedback, and whether it's approved (score >= 60).`;
}
