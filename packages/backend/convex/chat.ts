import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { vStreamArgs, vThreadDoc, vMessageDoc } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import agent from "./agent";

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
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
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

