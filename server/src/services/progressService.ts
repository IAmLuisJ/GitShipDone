import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, todos, timelineEvents } from "../db/schema";

/**
 * Recalculates project progress from todo completion ratios.
 * Logs a timeline event when progress changes by >= 5%.
 * Returns the new progress percentage (0-100).
 */
export async function recalculateProgress(
  projectId: string,
): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`sum(case when ${todos.isCompleted} then 1 else 0 end)::int`,
    })
    .from(todos)
    .where(eq(todos.projectId, projectId));

  const { total, done } = result[0];
  const pct = total === 0 ? 0 : Math.round(((done ?? 0) / total) * 100);

  const [project] = await db
    .select({ progressAuto: projects.progressAuto })
    .from(projects)
    .where(eq(projects.id, projectId));

  const oldPct = project?.progressAuto ?? 0;

  await db
    .update(projects)
    .set({ progressAuto: pct, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  if (Math.abs(pct - oldPct) >= 5) {
    await db.insert(timelineEvents).values({
      projectId,
      type: "progress_change",
      payload: { from: oldPct, to: pct, isManual: false },
    });
  }

  return pct;
}
