import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { runReminderCheck } from "../jobs/reminders";

const router = Router();

/**
 * Authenticate external schedulers with `Authorization: Bearer <CRON_SECRET>`.
 * When CRON_SECRET is unset the route 404s, so it is invisible unless a
 * deployment explicitly opts in to external triggering.
 */
function requireCronSecret(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    next(new AppError("Not found", 404));
    return;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    next(new AppError("Unauthorized", 401));
    return;
  }
  next();
}

/**
 * POST /api/jobs/reminders/run
 * Run the reminder check on demand. Intended for external schedulers
 * (e.g. cPanel cron via curl) on hosts where in-process cron is
 * unreliable. Duplicate-safe — see runReminderCheck.
 */
router.post(
  "/reminders/run",
  requireCronSecret,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await runReminderCheck();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
