import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, pointsLog, timelineEvents } from "../db/schema";
import { recalculateLevel } from "./levelService";

type PointSource =
  | "todo"
  | "milestone"
  | "journal"
  | "github_commit"
  | "github_release"
  | "manual";

/**
 * Award (or deduct) points for a project. Inserts a points_log record,
 * updates the project's points_total (clamped to >= 0), recalculates
 * the level, and logs a points_change timeline event.
 */
export async function awardPoints(
  projectId: string,
  delta: number,
  reason: string,
  source: PointSource,
): Promise<{ newTotal: number; level: string; didLevelUp: boolean }> {
  const [current] = await db
    .select({ pointsTotal: projects.pointsTotal })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const currentTotal = current?.pointsTotal ?? 0;
  const newTotal = Math.max(0, currentTotal + delta);

  await db.transaction(async (tx) => {
    await tx.insert(pointsLog).values({
      projectId,
      delta,
      reason,
      source,
    });

    await tx
      .update(projects)
      .set({ pointsTotal: newTotal, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  });

  const { level, didLevelUp } = await recalculateLevel(projectId, newTotal);

  await db.insert(timelineEvents).values({
    projectId,
    type: "points_change",
    payload: { delta, reason, newTotal },
  });

  return { newTotal, level, didLevelUp };
}
