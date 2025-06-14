"use node";

import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import agent from "./agent";
import { requireOwnThread, requireUserId } from "./threadOwnership";

export const sendMessage = action({
  args: { threadId: v.optional(v.string()), prompt: v.string() },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { threadId, prompt }) => {
    const userId = await requireUserId(ctx);
    if (threadId) {
      await requireOwnThread(ctx, threadId);
    }
    let useThreadId = threadId;
    if (!useThreadId) {
      const created = await agent.createThread(ctx, { userId });
      useThreadId = created.threadId;
    }
    const { thread } = await agent.continueThread(ctx, { threadId: useThreadId });
    await thread.generateText({ prompt });
    return { threadId: useThreadId };
  },
});

export const deleteThread = action({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    await requireOwnThread(ctx, threadId);
    await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, {
      threadId,
    });
    return null;
  },
});
