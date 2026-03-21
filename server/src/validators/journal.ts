import { z } from "zod";

export const createJournalSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  mood: z
    .enum(["excited", "blocked", "steady", "win", "learning"])
    .optional(),
});
