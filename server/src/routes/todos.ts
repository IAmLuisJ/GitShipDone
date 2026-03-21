import { Router, Request, Response, NextFunction } from "express";
import { eq, max, and, asc, SQL } from "drizzle-orm";

import { db } from "../db";
import { todos, milestones } from "../db/schema";
import { createTodoSchema } from "../validators/todos";
import { getOwnedProject } from "../utils/projectOwnership";
import { recalculateProgress } from "../services/progressService";

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:id/todos
 * Create a new to-do item. Optionally link to a milestone.
 * Sort order defaults to end of list. Triggers progress recalculation.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const parsed = createTodoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, milestoneId, dueDate, isUrgent } = parsed.data;

    // Verify milestone belongs to the same project if provided
    if (milestoneId) {
      const [milestone] = await db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.id, milestoneId),
            eq(milestones.projectId, projectId),
          ),
        )
        .limit(1);

      if (!milestone) {
        res.status(404).json({ error: "Milestone not found in this project" });
        return;
      }
    }

    // Compute next sort order
    const [maxResult] = await db
      .select({ maxOrder: max(todos.sortOrder) })
      .from(todos)
      .where(eq(todos.projectId, projectId));

    const nextSortOrder = (maxResult?.maxOrder ?? -1) + 1;

    const [todo] = await db
      .insert(todos)
      .values({
        projectId,
        title,
        milestoneId: milestoneId ?? null,
        dueDate: dueDate ?? null,
        isUrgent: isUrgent ?? false,
        sortOrder: nextSortOrder,
      })
      .returning();

    await recalculateProgress(projectId);

    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id/todos
 * List all to-dos for a project, ordered by sort_order ASC.
 * Optional filters: ?milestoneId=<uuid> and ?completed=true|false.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    await getOwnedProject(projectId, req.userId!);

    const conditions: SQL[] = [eq(todos.projectId, projectId)];

    if (req.query.milestoneId) {
      conditions.push(eq(todos.milestoneId, req.query.milestoneId as string));
    }

    if (req.query.completed === "true") {
      conditions.push(eq(todos.isCompleted, true));
    } else if (req.query.completed === "false") {
      conditions.push(eq(todos.isCompleted, false));
    }

    const result = await db
      .select()
      .from(todos)
      .where(and(...conditions))
      .orderBy(asc(todos.sortOrder));

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
