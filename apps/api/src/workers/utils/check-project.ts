import { db } from "@contenthq/db/client";
import { projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export class ProjectDeletedError extends Error {
  constructor(projectId: string) {
    super(`Project ${projectId} has been deleted or cancelled`);
    this.name = "ProjectDeletedError";
  }
}

/**
 * Check that a project still exists and is not cancelled.
 * Throws ProjectDeletedError if the project is gone or cancelled,
 * preventing workers from wasting resources on orphaned jobs.
 */
export async function assertProjectActive(projectId: string): Promise<void> {
  const [project] = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project || project.status === "cancelled") {
    throw new ProjectDeletedError(projectId);
  }
}
