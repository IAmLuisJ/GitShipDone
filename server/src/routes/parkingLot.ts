import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "../db";
import { parkingLotItems } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";
import { createParkingLotSchema } from "../validators/parkingLot";

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

/**
 * POST /api/projects/:id/parking-lot
 * Add a new parking lot idea to a project.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const parsed = createParkingLotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, description } = parsed.data;

    const [item] = await db
      .insert(parkingLotItems)
      .values({
        projectId,
        title,
        description: description ?? null,
      })
      .returning();

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

export default router;
