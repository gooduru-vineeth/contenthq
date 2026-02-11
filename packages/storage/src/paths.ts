export function getProjectPath(userId: string, projectId: string): string {
  return `users/${userId}/projects/${projectId}`;
}

export function getSceneVisualPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${userId}/projects/${projectId}/scenes/${sceneId}/visuals/${filename}`;
}

export function getSceneVideoPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${userId}/projects/${projectId}/scenes/${sceneId}/video/${filename}`;
}

export function getSceneAudioPath(
  userId: string,
  projectId: string,
  sceneId: string,
  filename: string
): string {
  return `users/${userId}/projects/${projectId}/scenes/${sceneId}/audio/${filename}`;
}

export function getOutputPath(
  userId: string,
  projectId: string,
  filename: string
): string {
  return `users/${userId}/projects/${projectId}/output/${filename}`;
}

export function getIngestedContentPath(
  userId: string,
  projectId: string,
  contentId: string
): string {
  return `users/${userId}/projects/${projectId}/ingested/content-${contentId}.json`;
}
