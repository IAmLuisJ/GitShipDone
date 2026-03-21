import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  milestoneId: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  isUrgent: z.boolean().optional(),
});
