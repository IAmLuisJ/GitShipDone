import { z } from "zod";

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

export const updateMilestoneSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    status: z.enum(["pending", "in_progress", "completed"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const reorderMilestonesSchema = z.object({
  milestoneIds: z.array(z.string().min(1)).min(1),
});
