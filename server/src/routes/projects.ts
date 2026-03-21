import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { projects, milestones, timelineEvents } from "../db/schema";
import { createProjectSchema } from "../validators/projects";

const router = Router();

/**
 * POST /api/projects
 * Create a new project for the authenticated user.
 * Optionally seeds milestone templates if provided.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, description, type, milestoneTemplates } = parsed.data;
    const userId = req.userId!;

    const result = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          userId,
          name,
          description: description ?? null,
          type,
          status: "active",
        })
        .returning();

      if (milestoneTemplates && milestoneTemplates.length > 0) {
        await tx.insert(milestones).values(
          milestoneTemplates.map((templateName, idx) => ({
            projectId: project.id,
            name: templateName,
            sortOrder: idx,
          })),
        );
      }

      await tx.insert(timelineEvents).values({
        projectId: project.id,
        type: "status_change",
        payload: { from: null, to: "active" },
      });

      return project;
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
