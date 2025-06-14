import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { vStreamArgs } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import agent from "./agent";

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await auth.getUser(ctx);
    if (!user) return [];
    const result = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: user.subject,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 50 },
    });
    return result.page;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    const paginated = await agent.listMessages(ctx, { threadId, paginationOpts });
    const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
    return { ...paginated, streams };
  },
});

export const sendMessage = mutation({
  args: { threadId: v.optional(v.string()), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    const user = await auth.getUser(ctx);
    if (!user) throw new Error("Not authenticated");
    let useThreadId = threadId;
    if (!useThreadId) {
      const created = await agent.createThread(ctx, { userId: user.subject });
      useThreadId = created.threadId;
    }
    const { thread } = await agent.continueThread(ctx, { threadId: useThreadId });
    await thread.generateText({ prompt });
    return { threadId: useThreadId };
  },
});
