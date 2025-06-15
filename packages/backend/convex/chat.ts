import { vMessageDoc, vStreamArgs, vThreadDoc } from "@convex-dev/agent";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import agent from "./agent";

export const DEFAULT_THREAD_TITLE = "New chat";

async function assertAuthenticatedUser(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export const listThreads = query({
  args: {},
  returns: v.array(vThreadDoc),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const result = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
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
  returns: v.object({
    page: v.array(vMessageDoc),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
    ),
    streams: v.optional(v.any()),
  }),
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    const paginated = await agent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
    return { ...paginated, streams };
  },
});

export const createThreadWithFirstMessage = mutation({
  args: { message: v.string(), optimisticTitle: v.optional(v.string()) },
  returns: v.object({ threadId: v.string(), messageId: v.string() }),
  handler: async (ctx, { message, optimisticTitle }) => {
    const userId = await assertAuthenticatedUser(ctx);
    const title =
      optimisticTitle && optimisticTitle.trim().length > 0
        ? optimisticTitle.trim().slice(0, 48)
        : DEFAULT_THREAD_TITLE;

    const thread = await agent.createThread(ctx, { userId, title });
    const { messageId } = await agent.saveMessage(ctx, {
      threadId: thread.threadId,
      userId,
      prompt: message,
      skipEmbeddings: true,
    });
    return { threadId: thread.threadId, messageId };
  },
});
