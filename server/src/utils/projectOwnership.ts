import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";
import { AppError } from "../middleware/errorHandler";

/**
 * Fetch a project by ID, ensuring it belongs to the given user
 * and is not soft-deleted. Throws 404 AppError if not found.
 */
export async function getOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  return project;
}
