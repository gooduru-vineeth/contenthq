import type { PipelineTemplate } from "../types/pipeline-template";
import { AI_VIDEO_TEMPLATE } from "./ai-video.template";
import { PRESENTATION_TEMPLATE } from "./presentation.template";
import { REMOTION_TEMPLATE } from "./remotion.template";
import { MOTION_CANVAS_TEMPLATE } from "./motion-canvas.template";

export { AI_VIDEO_TEMPLATE } from "./ai-video.template";
export { PRESENTATION_TEMPLATE } from "./presentation.template";
export { REMOTION_TEMPLATE } from "./remotion.template";
export { MOTION_CANVAS_TEMPLATE } from "./motion-canvas.template";

/** Map of all built-in pipeline templates keyed by template ID */
export const BUILTIN_TEMPLATES: Record<string, PipelineTemplate> = {
  [AI_VIDEO_TEMPLATE.id]: AI_VIDEO_TEMPLATE,
  [PRESENTATION_TEMPLATE.id]: PRESENTATION_TEMPLATE,
  [REMOTION_TEMPLATE.id]: REMOTION_TEMPLATE,
  [MOTION_CANVAS_TEMPLATE.id]: MOTION_CANVAS_TEMPLATE,
};

/** Map of all built-in pipeline templates keyed by slug */
export const BUILTIN_TEMPLATES_BY_SLUG: Record<string, PipelineTemplate> = {
  [AI_VIDEO_TEMPLATE.slug]: AI_VIDEO_TEMPLATE,
  [PRESENTATION_TEMPLATE.slug]: PRESENTATION_TEMPLATE,
  [REMOTION_TEMPLATE.slug]: REMOTION_TEMPLATE,
  [MOTION_CANVAS_TEMPLATE.slug]: MOTION_CANVAS_TEMPLATE,
};

/** Default template ID used when no template is specified */
export const DEFAULT_TEMPLATE_ID = AI_VIDEO_TEMPLATE.id;

/** Get a built-in template by ID, falling back to the default AI Video template */
export function getBuiltinTemplate(
  templateId: string | null | undefined
): PipelineTemplate {
  if (!templateId) {
    return AI_VIDEO_TEMPLATE;
  }
  return BUILTIN_TEMPLATES[templateId] ?? AI_VIDEO_TEMPLATE;
}
