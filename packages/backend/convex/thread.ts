import type { ThreadDoc } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { requireOwnThread } from "./threadOwnership";

/**
 * Remove a thread and all of its messages. Only the owning user is allowed to
 * perform this action.
 */
export const deleteThread = mutation({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    await requireOwnThread(ctx, threadId);
    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
      threadId,
    });
    return null;
  },
});

/**
 * Update the thread's title. The caller must own the thread.
 */
export const updateThread = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.string(),
    _creationTime: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, { threadId, title }) => {
    await requireOwnThread(ctx, threadId);

    const result = await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { title },
    });

    if (!result) {
      throw new Error("Failed to update thread");
    }

    return result as ThreadDoc;
  },
});
