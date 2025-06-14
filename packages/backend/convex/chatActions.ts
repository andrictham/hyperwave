"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import agent, { openrouter } from "./agent";
import { allowedModels, defaultModel } from "./models";

function isAllowedModel(value: string): value is (typeof allowedModels)[number] {
  return allowedModels.includes(value as (typeof allowedModels)[number]);
}

export const sendMessage = action({
  args: {
    threadId: v.optional(v.string()),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { threadId, prompt, model }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    let useThreadId = threadId;
    if (!useThreadId) {
      const created = await agent.createThread(ctx, { userId });
      useThreadId = created.threadId;
    }
    const { thread } = await agent.continueThread(ctx, {
      threadId: useThreadId,
    });
    const modelId = model && isAllowedModel(model) ? model : defaultModel;
    await thread.generateText({ prompt, model: openrouter.chat(modelId) });
    return { threadId: useThreadId };
  },
});

export const deleteThread = action({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
    if (thread === null || thread.userId !== userId) {
      throw new Error("Thread not found");
    }
    await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, {
      threadId,
    });
    return null;
  },
});
