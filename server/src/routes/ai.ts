import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

import { db } from "../db";
import { users } from "../db/schema";
import { decrypt } from "../utils/encryption";
import { getOwnedProject } from "../utils/projectOwnership";
import { buildProjectContext } from "../services/aiContextService";

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
});

const router = Router({ mergeParams: true });

const SYSTEM_PROMPT =
  "You are an AI Product Manager assistant for a solo builder. " +
  "Use the project context below to give specific, actionable advice. " +
  "Be concise and encouraging.\n\n";

/**
 * POST /api/projects/:id/ai/chat
 * Send a message to the AI PM copilot. Requires configured AI API key.
 */
router.post(
  "/chat",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const projectId = req.params.id as string;

      await getOwnedProject(projectId, userId);

      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user || !user.aiApiKey || !user.aiProvider) {
        return res.status(400).json({
          error: "AI API key not configured. Please set up AI settings first.",
        });
      }

      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const { message } = parsed.data;
      const apiKey = decrypt(user.aiApiKey);
      const context = await buildProjectContext(projectId);
      const systemPrompt = SYSTEM_PROMPT + context;

      let response: string;

      if (user.aiProvider === "openai") {
        response = await callOpenAI(apiKey, systemPrompt, message);
      } else {
        response = await callAnthropic(apiKey, systemPrompt, message);
      }

      return res.status(200).json({ response });
    } catch (err) {
      const error = err as Error & { status?: number; statusCode?: number };
      if (error.status === 404 || error.statusCode === 404) {
        return next(err);
      }
      console.error("[AI Chat] Error:", error.message);
      return res
        .status(500)
        .json({ error: "AI service unavailable" });
    }
  },
);

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content || "";
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export default router;
