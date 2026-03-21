import { db } from "../db";
import { timelineEvents } from "../db/schema";

type TimelineEventType =
  | "journal"
  | "milestone_completed"
  | "todo_batch"
  | "github_commit"
  | "github_release"
  | "progress_change"
  | "points_change"
  | "status_change";

/**
 * Log a timeline event for a project. Non-critical — errors are
 * caught and logged so callers are never interrupted by timeline failures.
 */
export async function logTimelineEvent(
  projectId: string,
  type: TimelineEventType,
  payload: Record<string, unknown>,
  refId?: string,
): Promise<void> {
  try {
    await db.insert(timelineEvents).values({
      projectId,
      type,
      payload,
      ...(refId ? { refId } : {}),
    });
  } catch (error) {
    console.error("Failed to log timeline event:", error);
  }
}
