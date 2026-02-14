import type { PromptType, PersonaCategory, AgentType, FlowData } from "@contenthq/shared";

export interface SeedPromptTemplate {
  type: PromptType;
  name: string;
  description: string;
  content: string;
  variables: string[];
}

export interface SeedPersona {
  category: PersonaCategory;
  name: string;
  label: string;
  description: string;
  promptFragment: string;
}

export interface SeedAgent {
  name: string;
  slug: string;
  description: string;
  agentType: AgentType;
  modelConfig?: { temperature?: number; maxTokens?: number };
  outputConfig?: {
    outputType: "text" | "object" | "array";
    schemaName?: string;
  };
  expectedVariables: string[];
  /** The prompt type this agent is associated with (for linking to seed templates) */
  promptType?: PromptType;
}

export const DEFAULT_PROMPT_TEMPLATES: SeedPromptTemplate[] = [
  {
    type: "story_writing",
    name: "Story Writing",
    description:
      "Generate a structured video story from source content with scenes, narration, and visual descriptions.",
    content: `You are a professional story writer creating narrated video content.

Based on the following source content, create a compelling video story.

SOURCE CONTENT:
{{content}}

REQUIREMENTS:
- Tone: {{tone}}
- Target duration: {{targetDuration}} seconds
- Number of scenes: {{sceneCount}}
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
5. Individual scenes with: visual description, narration script, image prompt, suggested duration, camera motion, and transition`,
    variables: ["content", "tone", "targetDuration", "sceneCount"],
  },
  {
    type: "scene_generation",
    name: "Scene Generation",
    description:
      "Break down a story into detailed scenes for video production with visual descriptions, image prompts, and motion specs.",
    content: `You are a video scene director. Break down the following story into detailed scenes for video production.

STORY:
Title: {{title}}
Hook: {{hook}}
Synopsis: {{synopsis}}

For each scene, provide:
1. Visual Description: Detailed description of what appears on screen
2. Image Prompt: A prompt suitable for AI image generation (DALL-E style)
3. Narration Script: Exact words the narrator speaks
4. Motion Spec: Camera movement (ken_burns, zoom_in, zoom_out, pan_left, pan_right, static)
5. Transition: How this scene transitions to the next (crossfade, cut, wipe)
6. Duration: Suggested duration in seconds (5-12)

Make each scene visually distinct and compelling. Ensure narration timing matches the suggested duration.`,
    variables: ["title", "hook", "synopsis"],
  },
  {
    type: "script_generation",
    name: "Script Generation",
    description:
      "Generate a continuous narration script from source content. The script is a single flowing text — scene boundaries are determined later from audio timing.",
    content: `You are a professional script writer creating narrated video content.

Based on the following source content, create a compelling continuous narration script.

SOURCE CONTENT:
{{content}}

REQUIREMENTS:
- Tone: {{tone}}
- Target duration: {{targetDuration}} seconds
- Target word count: approximately {{wordCount}} words
- Language: {{language}}
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

The full script should be a single continuous text, not divided into scenes. Scene boundaries will be determined later based on audio timing.`,
    variables: ["content", "tone", "targetDuration", "language"],
  },
  {
    type: "audio_scene_generation",
    name: "Audio Scene Generation",
    description:
      "Split a timestamped audio transcript into visual scenes for video production. Scene boundaries align with word-level timestamps from STT.",
    content: `You are a video scene director. Split the following timestamped narration into visual scenes for video production.

TIMESTAMPED TRANSCRIPT:
{{transcript}}

TOTAL DURATION: {{totalDurationSec}} seconds
SUGGESTED SCENE COUNT: ~{{suggestedSceneCount}} scenes (aim for {{averageSceneDurationSec}}s average per scene)
Visual style: {{visualStyle}}

RULES FOR SCENE BOUNDARIES:
1. Scene boundaries MUST align with word timestamps from the transcript
2. Each scene's startMs and endMs must correspond to actual word start/end times
3. Place scene breaks at natural pauses: sentence endings, topic shifts, or dramatic beats
4. Minimum scene duration: 3 seconds
5. Maximum scene duration: 15 seconds
6. Every word in the transcript must belong to exactly one scene (no gaps, no overlaps)

For each scene, provide:
1. index: Scene number (starting at 0)
2. startMs: Start time in milliseconds (must match a word's startMs)
3. endMs: End time in milliseconds (must match a word's endMs)
4. visualDescription: Detailed description of what appears on screen
5. imagePrompt: Optimized prompt for AI image generation (include art style, lighting, mood, composition; keep under 300 chars; no text/watermarks)
6. motionSpec: Camera movement {type, speed} — choose from: zoom_in, zoom_out, pan_left, pan_right, pan_up, pan_down, kenburns_in, kenburns_out, static. Speed: 0.1-1.0
7. transition: How this scene transitions to next (fade, fadeblack, dissolve, wipeleft, slideleft, circleopen, none for last scene)

Make each scene visually distinct. Vary motion types and transitions across scenes.`,
    variables: ["transcript", "totalDurationSec", "suggestedSceneCount", "averageSceneDurationSec", "visualStyle"],
  },
  {
    type: "image_refinement",
    name: "Image Prompt Refinement",
    description:
      "Convert a scene description into an optimized image generation prompt with art style, lighting, and composition details.",
    content: `Convert the following scene description into an optimized image generation prompt.

SCENE DESCRIPTION:
{{visualDescription}}

REQUIREMENTS:
- Create a single, specific image prompt
- Include art style (photorealistic, cinematic, illustration, etc.)
- Specify lighting and mood
- Include composition details (close-up, wide shot, etc.)
- Keep under 300 characters
- Do not include text or watermarks in the image
- Focus on one clear subject/moment`,
    variables: ["visualDescription"],
  },
  {
    type: "image_generation",
    name: "Image Generation",
    description:
      "Generate an AI image prompt from a visual description with style parameters.",
    content: `{{visualDescription}}. Style: {{style}}, photorealistic, high quality, 4K resolution, professional photography, dramatic lighting. No text, no watermarks, no logos.`,
    variables: ["visualDescription", "style"],
  },
  {
    type: "visual_verification",
    name: "Visual Verification",
    description:
      "Evaluate an AI-generated image against a scene description with scoring criteria.",
    content: `Evaluate this AI-generated image against the following scene description:

SCENE DESCRIPTION:
{{sceneDescription}}

Score on these criteria:
1. Relevance (0-30): How well does the image match the scene description?
2. Quality (0-25): Image clarity, composition, and visual appeal
3. Consistency (0-25): Internal consistency, no artifacts or distortions
4. Safety (0-20): Appropriate for general audiences

Provide a total score (sum of all), brief feedback, and whether it's approved (score >= 60).`,
    variables: ["sceneDescription"],
  },
];

export const DEFAULT_PERSONAS: SeedPersona[] = [
  // Tone personas
  {
    category: "tone",
    name: "professional",
    label: "Professional",
    description: "Formal and authoritative tone suitable for business contexts.",
    promptFragment:
      "Maintain a professional, authoritative tone. Use clear, precise language suitable for business and corporate contexts. Avoid colloquialisms and informal expressions.",
  },
  {
    category: "tone",
    name: "conversational",
    label: "Conversational",
    description: "Friendly and approachable tone for casual content.",
    promptFragment:
      "Use a warm, conversational tone as if speaking to a friend. Keep language natural and approachable. Use contractions and everyday vocabulary.",
  },
  {
    category: "tone",
    name: "educational",
    label: "Educational",
    description: "Clear and instructive tone for teaching content.",
    promptFragment:
      "Adopt an educational tone that explains concepts clearly. Break down complex ideas into digestible parts. Use examples and analogies to aid understanding.",
  },
  {
    category: "tone",
    name: "encouraging",
    label: "Encouraging",
    description: "Supportive and uplifting tone to inspire the audience.",
    promptFragment:
      "Use an encouraging, supportive tone that uplifts the audience. Celebrate progress, acknowledge challenges, and inspire action with positive reinforcement.",
  },
  {
    category: "tone",
    name: "motivational",
    label: "Motivational",
    description:
      "High-energy tone designed to drive action and inspire change.",
    promptFragment:
      "Deliver with high-energy motivational intensity. Use powerful, action-oriented language that drives urgency and inspires transformation. Build momentum with strong calls to action.",
  },
  {
    category: "tone",
    name: "entertaining",
    label: "Entertaining",
    description:
      "Fun, engaging tone designed to captivate and hold attention.",
    promptFragment:
      "Keep the tone fun, witty, and engaging. Use humor where appropriate, create surprise moments, and maintain an energetic pace that holds viewer attention.",
  },

  // Audience personas
  {
    category: "audience",
    name: "general",
    label: "General Audience",
    description: "Content suitable for a broad, diverse audience.",
    promptFragment:
      "Write for a general audience with no assumed specialized knowledge. Use universally accessible language and relatable examples that resonate across demographics.",
  },
  {
    category: "audience",
    name: "professionals",
    label: "Professionals",
    description:
      "Content tailored for industry professionals and experts.",
    promptFragment:
      "Target working professionals with industry awareness. Use appropriate technical terminology, reference real-world business scenarios, and maintain a results-oriented perspective.",
  },
  {
    category: "audience",
    name: "teenagers",
    label: "Teenagers",
    description: "Content designed for teen audiences aged 13-19.",
    promptFragment:
      "Write for a teenage audience. Use contemporary, relatable language without being condescending. Reference trends and experiences relevant to young people while keeping content age-appropriate.",
  },
  {
    category: "audience",
    name: "children",
    label: "Children",
    description: "Content appropriate for young children aged 6-12.",
    promptFragment:
      "Write for young children with simple, clear language. Use short sentences, vivid imagery, and a sense of wonder. Avoid complex vocabulary and ensure all content is age-appropriate and safe.",
  },
  {
    category: "audience",
    name: "creators",
    label: "Creators",
    description:
      "Content for content creators, influencers, and digital media professionals.",
    promptFragment:
      "Target content creators and digital media professionals. Reference platform-specific strategies, engagement metrics, and creative workflows. Speak as a peer sharing insider knowledge.",
  },

  // Visual Style personas
  {
    category: "visual_style",
    name: "cinematic",
    label: "Cinematic",
    description:
      "Film-quality visual style with dramatic composition and lighting.",
    promptFragment:
      "Use cinematic visual composition with dramatic lighting, wide establishing shots, and film-quality framing. Emphasize depth of field and atmospheric mood.",
  },
  {
    category: "visual_style",
    name: "minimal",
    label: "Minimal",
    description:
      "Clean, minimalist visual style with ample whitespace and simplicity.",
    promptFragment:
      "Apply a minimal visual style with clean lines, generous whitespace, and restrained color palettes. Focus on essential elements only, removing visual clutter.",
  },
  {
    category: "visual_style",
    name: "corporate",
    label: "Corporate",
    description:
      "Polished, professional visual style suitable for business presentations.",
    promptFragment:
      "Use a polished corporate visual style with professional color schemes, structured layouts, and business-appropriate imagery. Maintain brand consistency and visual hierarchy.",
  },
  {
    category: "visual_style",
    name: "vibrant",
    label: "Vibrant",
    description:
      "Bold, colorful visual style with high energy and saturation.",
    promptFragment:
      "Use bold, vibrant visuals with saturated colors, dynamic compositions, and high-energy aesthetics. Create visually striking scenes that grab attention immediately.",
  },
  {
    category: "visual_style",
    name: "editorial",
    label: "Editorial",
    description:
      "Magazine-quality visual style with artistic composition.",
    promptFragment:
      "Apply an editorial visual style reminiscent of high-end magazines. Use carefully composed shots, artistic angles, and sophisticated color grading with attention to typography and layout.",
  },

  // Narrative Style personas
  {
    category: "narrative_style",
    name: "documentary",
    label: "Documentary",
    description:
      "Fact-driven narrative style with journalistic integrity.",
    promptFragment:
      "Structure the narrative like a documentary with fact-based storytelling. Present information objectively, use evidence to support claims, and build credibility through thorough research and balanced perspectives.",
  },
  {
    category: "narrative_style",
    name: "storytelling",
    label: "Storytelling",
    description:
      "Character-driven narrative with emotional arcs and compelling plots.",
    promptFragment:
      "Craft a narrative-driven story with character development, emotional arcs, and compelling plot progression. Use descriptive language, build tension, and create resolution for a satisfying story experience.",
  },
  {
    category: "narrative_style",
    name: "listicle",
    label: "Listicle",
    description:
      "Numbered list format for easy consumption and shareability.",
    promptFragment:
      "Structure content as a numbered list with clear, distinct points. Each item should be self-contained yet contribute to the overall narrative. Use punchy headings and concise explanations.",
  },
  {
    category: "narrative_style",
    name: "how_to",
    label: "How-To",
    description:
      "Step-by-step instructional format for tutorials and guides.",
    promptFragment:
      "Present content as clear, sequential steps that guide the viewer through a process. Number each step, provide specific actionable instructions, and anticipate common questions or mistakes.",
  },
  {
    category: "narrative_style",
    name: "explainer",
    label: "Explainer",
    description:
      "Concept-focused format that breaks down complex topics simply.",
    promptFragment:
      "Structure content as an explainer that breaks down complex topics into understandable segments. Start with the big picture, then dive into details. Use analogies, examples, and visual metaphors.",
  },
];

export const DEFAULT_AGENTS: SeedAgent[] = [
  {
    name: "Story Writer",
    slug: "story-writer",
    description:
      "Generates structured video stories from source content with scenes, narration, visual descriptions, and image prompts.",
    agentType: "llm_structured",
    modelConfig: { temperature: 0.7, maxTokens: 6000 },
    outputConfig: { outputType: "object", schemaName: "story_output" },
    expectedVariables: ["content", "tone", "targetDuration", "sceneCount"],
    promptType: "story_writing",
  },
  {
    name: "Scene Generator",
    slug: "scene-generator",
    description:
      "Breaks down stories into detailed scenes for video production with visual descriptions and image prompts.",
    agentType: "llm_structured",
    modelConfig: { temperature: 0.7, maxTokens: 3000 },
    outputConfig: { outputType: "object", schemaName: "scene_output" },
    expectedVariables: ["title", "hook", "synopsis"],
    promptType: "scene_generation",
  },
  {
    name: "Script Writer",
    slug: "script-writer",
    description:
      "Generates a continuous narration script from source content. Audio-first pipeline: script is generated before TTS and scene splitting.",
    agentType: "llm_structured",
    modelConfig: { temperature: 0.7, maxTokens: 6000 },
    outputConfig: { outputType: "object", schemaName: "script_output" },
    expectedVariables: ["content", "tone", "targetDuration", "language"],
    promptType: "script_generation",
  },
  {
    name: "Audio Scene Director",
    slug: "audio-scene-director",
    description:
      "Splits a timestamped audio transcript into visual scenes with boundaries aligned to word-level timestamps from STT.",
    agentType: "llm_structured",
    modelConfig: { temperature: 0.7, maxTokens: 8000 },
    outputConfig: { outputType: "object", schemaName: "audio_scene_output" },
    expectedVariables: ["transcript", "totalDurationSec", "suggestedSceneCount", "averageSceneDurationSec", "visualStyle"],
    promptType: "audio_scene_generation",
  },
  {
    name: "Image Prompt Refiner",
    slug: "image-prompt-refiner",
    description:
      "Converts scene descriptions into optimized image generation prompts with art style and composition details.",
    agentType: "llm_text",
    modelConfig: { temperature: 0.7, maxTokens: 500 },
    outputConfig: { outputType: "text" },
    expectedVariables: ["visualDescription"],
    promptType: "image_refinement",
  },
  {
    name: "Image Generator",
    slug: "image-generator",
    description:
      "Generates AI images from optimized prompts for video scenes.",
    agentType: "image_generation",
    outputConfig: { outputType: "object" },
    expectedVariables: ["prompt"],
  },
  {
    name: "Visual Verifier",
    slug: "visual-verifier",
    description:
      "Evaluates AI-generated images against scene descriptions with scoring criteria.",
    agentType: "vision_verification",
    outputConfig: { outputType: "object", schemaName: "verification_output" },
    expectedVariables: ["imageUrl", "sceneDescription"],
    promptType: "visual_verification",
  },
];

/**
 * Default flow that mirrors the existing hardcoded pipeline as a node graph.
 * Input -> Ingestion -> Story Writer -> Scene Generator -> ParallelFanOut ->
 * [Image Gen -> Visual Verify] -> ParallelFanIn -> TTS -> Audio Mix -> Video Assembly -> Output
 */
export const DEFAULT_FLOW: { name: string; slug: string; description: string; flowData: FlowData } = {
  name: "Default Content Pipeline",
  slug: "default-content-pipeline",
  description:
    "Standard content pipeline: Ingestion -> Story Writing -> Scene Generation -> Visual Generation -> Verification -> TTS -> Audio Mixing -> Video Assembly",
  flowData: {
    nodes: [
      { id: "input", type: "input", position: { x: 0, y: 300 }, data: { label: "Content Input", nodeType: "input" } },
      { id: "ingestion", type: "builtin", position: { x: 250, y: 300 }, data: { label: "Ingestion", nodeType: "builtin", builtinAction: "ingestion" } },
      { id: "story-writer", type: "agent", position: { x: 500, y: 300 }, data: { label: "Story Writer", nodeType: "agent", agentId: "story-writer" } },
      { id: "scene-gen", type: "agent", position: { x: 750, y: 300 }, data: { label: "Scene Generator", nodeType: "agent", agentId: "scene-generator" } },
      { id: "fan-out", type: "parallelFanOut", position: { x: 1000, y: 300 }, data: { label: "Fan Out Scenes", nodeType: "parallelFanOut", iterateField: "scenes" } },
      { id: "image-gen", type: "agent", position: { x: 1250, y: 200 }, data: { label: "Image Generator", nodeType: "agent", agentId: "image-generator" } },
      { id: "visual-verify", type: "agent", position: { x: 1500, y: 200 }, data: { label: "Visual Verifier", nodeType: "agent", agentId: "visual-verifier" } },
      { id: "fan-in", type: "parallelFanIn", position: { x: 1750, y: 300 }, data: { label: "Fan In Results", nodeType: "parallelFanIn" } },
      { id: "tts", type: "builtin", position: { x: 2000, y: 300 }, data: { label: "TTS Generation", nodeType: "builtin", builtinAction: "tts_generation" } },
      { id: "audio-mix", type: "builtin", position: { x: 2250, y: 300 }, data: { label: "Audio Mixing", nodeType: "builtin", builtinAction: "audio_mixing" } },
      { id: "video-assembly", type: "builtin", position: { x: 2500, y: 300 }, data: { label: "Video Assembly", nodeType: "builtin", builtinAction: "video_assembly" } },
      { id: "output", type: "output", position: { x: 2750, y: 300 }, data: { label: "Final Video", nodeType: "output" } },
    ],
    edges: [
      { id: "e-input-ingestion", source: "input", target: "ingestion" },
      { id: "e-ingestion-story", source: "ingestion", target: "story-writer" },
      { id: "e-story-scene", source: "story-writer", target: "scene-gen" },
      { id: "e-scene-fanout", source: "scene-gen", target: "fan-out" },
      { id: "e-fanout-image", source: "fan-out", target: "image-gen" },
      { id: "e-image-verify", source: "image-gen", target: "visual-verify" },
      { id: "e-verify-fanin", source: "visual-verify", target: "fan-in" },
      { id: "e-fanin-tts", source: "fan-in", target: "tts" },
      { id: "e-tts-audiomix", source: "tts", target: "audio-mix" },
      { id: "e-audiomix-assembly", source: "audio-mix", target: "video-assembly" },
      { id: "e-assembly-output", source: "video-assembly", target: "output" },
    ],
  },
};
