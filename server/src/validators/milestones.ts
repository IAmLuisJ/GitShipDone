import { z } from "zod";

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});
