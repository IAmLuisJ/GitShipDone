import { z } from "zod";

export const connectGithubSchema = z.object({
  repoOwner: z.string().min(1).max(255),
  repoName: z.string().min(1).max(255),
});
