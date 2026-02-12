function sanitizePathSegment(segment: string): string {
  // Remove path traversal attempts and dangerous characters
  return segment.replace(/[/\\.]+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function sanitizeFilename(filename: string): string {
  // Get just the filename, no directory components
  const base = filename.split('/').pop()?.split('\\').pop() ?? filename;
  return base.replace(/[^a-zA-Z0-9._-]/g, '');
}

export function getProjectPath(userId: string, projectId: string): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}`;
}

export function getSceneVisualPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}/scenes/${sanitizePathSegment(sceneId)}/visuals/${sanitizeFilename(filename)}`;
}

export function getSceneVideoPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}/scenes/${sanitizePathSegment(sceneId)}/video/${sanitizeFilename(filename)}`;
}

export function getSceneAudioPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}/scenes/${sanitizePathSegment(sceneId)}/audio/${sanitizeFilename(filename)}`;
}

export function getOutputPath(
  userId: string,
  projectId: string,
  filename: string
): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}/output/${sanitizeFilename(filename)}`;
}

export function getIngestedContentPath(
  userId: string,
  projectId: string,
  contentId: string
): string {
  return `users/${sanitizePathSegment(userId)}/projects/${sanitizePathSegment(projectId)}/ingested/content-${sanitizePathSegment(contentId)}.json`;
}

export function getMediaUploadPath(
  userId: string,
  filename: string
): string {
  const uuid = crypto.randomUUID();
  return `users/${sanitizePathSegment(userId)}/media/${uuid}-${sanitizeFilename(filename)}`;
}

export function getSpeechGenerationPath(
  userId: string,
  speechGenerationId: string,
  filename: string
): string {
  return `users/${sanitizePathSegment(userId)}/speech-generations/${sanitizePathSegment(speechGenerationId)}/${sanitizeFilename(filename)}`;
}
