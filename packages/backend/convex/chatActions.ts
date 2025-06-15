"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import agent from "./agent";

export const sendMessage = action({
  args: { threadId: v.optional(v.string()), prompt: v.string() },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { threadId, prompt }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
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

export const updateThread = action({
  args: { 
    threadId: v.string(),
    title: v.optional(v.string()) 
  },
  returns: v.object({
    _id: v.string(),
    _creationTime: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    title: v.optional(v.string()),
    userId: v.optional(v.string())
  }),
  handler: async (ctx, { threadId, title }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
    if (thread === null || thread.userId !== userId) {
      throw new Error("Thread not found");
    }
    
    // Update the thread using the Convex mutation
    const result = await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { title }
    });
    
    if (!result) {
      throw new Error("Failed to update thread");
    }
    
    return result;
  },
});
