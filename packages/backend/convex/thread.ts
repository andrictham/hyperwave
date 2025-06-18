import { vThreadDoc, type ThreadDoc } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "../convex/_generated/api";
import { internalAction, mutation, query } from "../convex/_generated/server";
import { requireOwnThread, requireUserId } from "../utils/threadOwnership";
import agent from "./agent";

export const listThreads = query({
  args: {},
  returns: v.array(vThreadDoc),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const result = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 50 },
    });
    return result.page;
  },
});

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(vThreadDoc, v.null()),
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnThread(ctx, threadId);
    return thread;
  },
});

/**
 * Create a new thread
 */
export const createThread = mutation({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId }) => {
    const useUserId = userId || (await requireUserId(ctx));
    const { threadId } = await agent.createThread(ctx, { userId: useUserId });
    return threadId;
  },
});

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

/**
 * Updates the thread title if it's missing or generic.
 * @param thread - The thread to potentially update
 * @param ctx - The Convex action context
 */

/**
 * Updates the thread title if it's missing or generic.
 * @param thread - The thread to potentially update
 * @param ctx - The Convex action context
 */
export const maybeUpdateThreadTitle = internalAction({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const threadData = await ctx.runQuery(components.agent.threads.getThread, {
      threadId,
    });
    const existingTitle = threadData?.title;
    const { thread } = await agent.continueThread(ctx, { threadId });

    if (!existingTitle || existingTitle === "Untitled") {
      const { text } = await thread.generateText(
        {
          prompt:
            "Reply ONLY with a concise, descriptive title for this conversation of maximum 5 words or 40 characters. Do not wrap the title in quotation marks. SAY NOTHING ELSE.",
        },
        { storageOptions: { saveMessages: "none" } },
      );
      if (text) {
        await ctx.runMutation(components.agent.threads.updateThread, {
          threadId: thread.threadId,
          patch: { title: text },
        });
      }
    }
  },
});
