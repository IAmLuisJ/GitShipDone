import { Router, Request, Response, NextFunction } from "express";
import { eq, max, and, asc, SQL } from "drizzle-orm";

import { db } from "../db";
import { todos, milestones } from "../db/schema";
import {
  createTodoSchema,
  updateTodoSchema,
  reorderTodosSchema,
} from "../validators/todos";
import { getOwnedProject } from "../utils/projectOwnership";
import { recalculateProgress } from "../services/progressService";
import { awardPoints } from "../services/pointsService";

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

/**
 * PATCH /api/projects/:id/todos/reorder
 * Accept an ordered list of todo IDs and update sort_order based on array position.
 * Must be defined BEFORE /:tid to avoid Express matching 'reorder' as a :tid param.
 */
router.patch(
  "/reorder",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = reorderTodosSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { orderedIds } = parsed.data;

      // Verify all IDs belong to this project
      const projectTodos = await db
        .select({ id: todos.id })
        .from(todos)
        .where(eq(todos.projectId, projectId));

      const projectTodoIds = new Set(projectTodos.map((t) => t.id));
      const foreignIds = orderedIds.filter((id) => !projectTodoIds.has(id));

      if (foreignIds.length > 0) {
        res
          .status(400)
          .json({ error: "Some todo IDs do not belong to this project" });
        return;
      }

      // Update sort_order in a transaction
      await db.transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
          await tx
            .update(todos)
            .set({ sortOrder: i, updatedAt: new Date() })
            .where(eq(todos.id, orderedIds[i]));
        }
      });

      res.status(200).json({ message: "Order updated" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/projects/:id/todos/:tid
 * Update a to-do's title, completion state, urgency, due date, or milestone.
 * Completing awards +10 points; uncompleting deducts -10 points.
 * Progress is recalculated after any change.
 */
router.patch(
  "/:tid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const todoId = req.params.tid as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = updateTodoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const [existing] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, todoId), eq(todos.projectId, projectId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }

      const data = parsed.data;

      // Validate milestone if provided
      if (data.milestoneId) {
        const [milestone] = await db
          .select()
          .from(milestones)
          .where(
            and(
              eq(milestones.id, data.milestoneId),
              eq(milestones.projectId, projectId),
            ),
          )
          .limit(1);

        if (!milestone) {
          res
            .status(404)
            .json({ error: "Milestone not found in this project" });
          return;
        }
      }

      // Build update fields
      const updateFields: Record<string, unknown> = { updatedAt: new Date() };

      if (data.title !== undefined) updateFields.title = data.title;
      if (data.isUrgent !== undefined) updateFields.isUrgent = data.isUrgent;
      if (data.dueDate !== undefined) updateFields.dueDate = data.dueDate;
      if (data.milestoneId !== undefined)
        updateFields.milestoneId = data.milestoneId;

      // Detect completion state change
      if (data.isCompleted !== undefined) {
        updateFields.isCompleted = data.isCompleted;
        if (data.isCompleted && !existing.isCompleted) {
          // Completing
          updateFields.completedAt = new Date();
          await awardPoints(
            projectId,
            10,
            `Completed todo: ${existing.title}`,
            "todo",
          );
        } else if (!data.isCompleted && existing.isCompleted) {
          // Uncompleting
          updateFields.completedAt = null;
          await awardPoints(
            projectId,
            -10,
            `Unchecked todo: ${existing.title}`,
            "todo",
          );
        }
      }

      const [updated] = await db
        .update(todos)
        .set(updateFields)
        .where(and(eq(todos.id, todoId), eq(todos.projectId, projectId)))
        .returning();

      const progress = await recalculateProgress(projectId);

      res.status(200).json({ todo: updated, progress });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id/todos/:tid
 * Permanently delete a to-do and recalculate project progress.
 */
router.delete(
  "/:tid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const todoId = req.params.tid as string;
      await getOwnedProject(projectId, req.userId!);

      const [existing] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.id, todoId), eq(todos.projectId, projectId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }

      await db
        .delete(todos)
        .where(and(eq(todos.id, todoId), eq(todos.projectId, projectId)));

      const progress = await recalculateProgress(projectId);

      res.status(200).json({ message: "Todo deleted", progress });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
