import { z } from "zod";

export const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  milestoneId: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  isUrgent: z.boolean().optional(),
});

export const updateTodoSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    isCompleted: z.boolean().optional(),
    isUrgent: z.boolean().optional(),
    dueDate: z.string().date().nullable().optional(),
    milestoneId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const reorderTodosSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
