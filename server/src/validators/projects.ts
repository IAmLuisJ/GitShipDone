import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  type: z.enum([
    "software",
    "design",
    "physical",
    "content",
    "learning",
    "other",
  ]),
  milestoneTemplates: z.array(z.string().max(255)).max(10).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  type: z
    .enum(["software", "design", "physical", "content", "learning", "other"])
    .optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
});
