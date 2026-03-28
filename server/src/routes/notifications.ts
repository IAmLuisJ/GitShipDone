import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull, desc, lt, or, sql, count } from "drizzle-orm";

import { db } from "../db";
import { notifications } from "../db/schema";

const router = Router();

/**
 * GET /api/notifications
 * List notifications for the authenticated user.
 * Excludes snoozed notifications where snoozed_until > NOW().
 * Supports ?unreadOnly=true to filter only unread.
 * Returns { notifications, unreadCount }.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const unreadOnly = req.query.unreadOnly === "true";
    const now = new Date();

    const baseConditions = [
      eq(notifications.userId, userId),
      or(isNull(notifications.snoozedUntil), lt(notifications.snoozedUntil, now)),
    ];

    const listConditions = unreadOnly
      ? [...baseConditions, eq(notifications.isRead, false)]
      : baseConditions;

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...listConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [{ value: unreadCount }] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          or(isNull(notifications.snoozedUntil), lt(notifications.snoozedUntil, now)),
        ),
      );

    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    next(err);
  }
});

export default router;
