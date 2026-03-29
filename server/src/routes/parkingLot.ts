import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc, max } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

import { db } from "../db";
import { parkingLotItems, milestones, todos, users } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";
import { decrypt } from "../utils/encryption";
import { buildProjectContext } from "../services/aiContextService";
import {
  createParkingLotSchema,
  updateParkingLotSchema,
  promoteParkingLotSchema,
} from "../validators/parkingLot";

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

/**
 * PATCH /api/projects/:id/parking-lot/:pid
 * Update a parking lot item's title, description, or archive/unarchive it.
 */
router.patch(
  "/:pid",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const pid = req.params.pid as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = updateParkingLotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { title, description, archived } = parsed.data;

      if (
        title === undefined &&
        description === undefined &&
        archived === undefined
      ) {
        res.status(400).json({ error: "At least one field must be provided" });
        return;
      }

      // Check item exists and belongs to project
      const [existing] = await db
        .select()
        .from(parkingLotItems)
        .where(
          and(
            eq(parkingLotItems.id, pid),
            eq(parkingLotItems.projectId, projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Parking lot item not found" });
        return;
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (archived === true) updates.archivedAt = new Date();
      if (archived === false) updates.archivedAt = null;

      const [updated] = await db
        .update(parkingLotItems)
        .set(updates)
        .where(eq(parkingLotItems.id, pid))
        .returning();

      res.json({ item: updated });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/projects/:id/parking-lot/:pid/promote
 * Promote a parking lot item to a milestone or todo, then archive the item.
 */
router.post(
  "/:pid/promote",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const pid = req.params.pid as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = promoteParkingLotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { targetType } = parsed.data;

      // Find the parking lot item
      const [item] = await db
        .select()
        .from(parkingLotItems)
        .where(
          and(
            eq(parkingLotItems.id, pid),
            eq(parkingLotItems.projectId, projectId),
          ),
        )
        .limit(1);

      if (!item) {
        res.status(404).json({ error: "Parking lot item not found" });
        return;
      }

      let created: unknown;

      if (targetType === "milestone") {
        const [maxResult] = await db
          .select({ maxOrder: max(milestones.sortOrder) })
          .from(milestones)
          .where(eq(milestones.projectId, projectId));

        const nextSortOrder = (maxResult?.maxOrder ?? -1) + 1;

        const [milestone] = await db
          .insert(milestones)
          .values({
            projectId,
            name: item.title,
            description: item.description,
            sortOrder: nextSortOrder,
          })
          .returning();

        created = milestone;
      } else {
        const [maxResult] = await db
          .select({ maxOrder: max(todos.sortOrder) })
          .from(todos)
          .where(eq(todos.projectId, projectId));

        const nextSortOrder = (maxResult?.maxOrder ?? -1) + 1;

        const [todo] = await db
          .insert(todos)
          .values({
            projectId,
            title: item.title,
            sortOrder: nextSortOrder,
          })
          .returning();

        created = todo;
      }

      // Archive the parking lot item
      await db
        .update(parkingLotItems)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(parkingLotItems.id, pid));

      res.json({ created });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/projects/:id/parking-lot/:pid/ai-pathway
 * Generate an AI step-by-step implementation pathway for a parking lot item.
 */
router.post(
  "/:pid/ai-pathway",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const pid = req.params.pid as string;
      const userId = req.userId!;

      await getOwnedProject(projectId, userId);

      // Check user has AI key configured
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user || !user.aiApiKey || !user.aiProvider) {
        res.status(400).json({
          error: "AI API key not configured. Please set up AI settings first.",
        });
        return;
      }

      // Find parking lot item
      const [item] = await db
        .select()
        .from(parkingLotItems)
        .where(
          and(
            eq(parkingLotItems.id, pid),
            eq(parkingLotItems.projectId, projectId),
          ),
        )
        .limit(1);

      if (!item) {
        res.status(404).json({ error: "Parking lot item not found" });
        return;
      }

      const apiKey = decrypt(user.aiApiKey);
      const context = await buildProjectContext(projectId);

      const prompt =
        "Generate a step-by-step implementation pathway for this idea: " +
        item.title +
        (item.description ? ". Description: " + item.description : "") +
        ". Project context: " +
        context +
        ". Return a numbered list of clear, actionable steps.";

      let pathway: string;

      if (user.aiProvider === "openai") {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
        });
        pathway = completion.choices[0]?.message?.content || "";
      } else {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        const block = message.content[0];
        pathway = block.type === "text" ? block.text : "";
      }

      // Save pathway to item
      await db
        .update(parkingLotItems)
        .set({ aiPathway: pathway, updatedAt: new Date() })
        .where(eq(parkingLotItems.id, pid));

      res.status(200).json({ pathway });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      if (e.status === 404 || e.statusCode === 404) {
        return next(err);
      }
      console.error("[AI Pathway] Error:", (e as Error).message);
      res.status(500).json({ error: "AI service unavailable" });
    }
  },
);

export default router;
