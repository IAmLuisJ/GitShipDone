import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "../db";
import { parkingLotItems } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";

const router = Router({ mergeParams: true });

/**
 * GET /api/projects/:id/parking-lot
 * List parking lot items, ordered by created_at DESC.
 * Excludes archived items unless ?includeArchived=true.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const includeArchived = req.query.includeArchived === "true";

    const conditions = [eq(parkingLotItems.projectId, projectId)];
    if (!includeArchived) {
      conditions.push(isNull(parkingLotItems.archivedAt));
    }

    const items = await db
      .select()
      .from(parkingLotItems)
      .where(and(...conditions))
      .orderBy(desc(parkingLotItems.createdAt));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
