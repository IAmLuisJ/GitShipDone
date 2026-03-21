import { Router, Request, Response, NextFunction } from "express";
import { eq, and, desc, count, inArray } from "drizzle-orm";

import { db } from "../db";
import { timelineEvents } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";

const router = Router({ mergeParams: true });

/** Valid timeline event types for filtering */
const VALID_EVENT_TYPES = [
  "journal",
  "milestone_completed",
  "todo_batch",
  "github_commit",
  "github_release",
  "progress_change",
  "points_change",
  "status_change",
] as const;

/**
 * GET /api/projects/:id/timeline
 * Paginated timeline events, newest first.
 * Supports ?type= (comma-separated event types), ?page=, ?limit= (max 100).
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 50, 1),
      100,
    );
    const offset = (page - 1) * limit;

    // Build type filter from comma-separated query param
    const typeParam = req.query.type as string | undefined;
    const typeFilters = typeParam
      ? typeParam
          .split(",")
          .map((t) => t.trim())
          .filter((t) =>
            (VALID_EVENT_TYPES as readonly string[]).includes(t),
          )
      : [];

    // Build WHERE conditions
    const conditions = [eq(timelineEvents.projectId, projectId)];
    if (typeFilters.length > 0) {
      conditions.push(
        inArray(
          timelineEvents.type,
          typeFilters as [(typeof VALID_EVENT_TYPES)[number]],
        ),
      );
    }

    const whereClause = and(...conditions);

    const [events, [{ total }]] = await Promise.all([
      db
        .select()
        .from(timelineEvents)
        .where(whereClause)
        .orderBy(desc(timelineEvents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(timelineEvents)
        .where(whereClause),
    ]);

    res.json({ events, total, page, limit });
  } catch (err) {
    next(err);
  }
});

export default router;
