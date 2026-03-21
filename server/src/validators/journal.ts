import { z } from "zod";

export const createJournalSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  mood: z
    .enum(["excited", "blocked", "steady", "win", "learning"])
    .optional(),
});

export const updateJournalSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    body: z.string().min(1).optional(),
    mood: z
      .enum(["excited", "blocked", "steady", "win", "learning"])
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
